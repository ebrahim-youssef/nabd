package com.nabd.app;

import android.app.Activity;
import android.content.Intent;
import android.content.IntentSender;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationSettingsRequest;
import com.google.android.gms.location.Priority;
import com.google.android.gms.location.SettingsClient;
import com.google.android.gms.tasks.Task;

/**
 * Pops the Google Play Services "turn on location" dialog in-app when the device-wide GPS
 * toggle is off, instead of dead-ending on a "go enable it yourself" message (NBD-63).
 *
 * enable() runs SettingsClient.checkLocationSettings; if the settings are already satisfied it
 * resolves { enabled: true }. If they can be fixed with a system dialog it shows that dialog
 * (ResolvableApiException) and resolves based on whether the user accepted. Any non-resolvable
 * failure resolves { enabled: false } so the JS caller falls back to the existing copy.
 */
@CapacitorPlugin(name = "LocationEnabler")
public class LocationEnablerPlugin extends Plugin {

    private static final int REQUEST_ENABLE_LOCATION = 0x5A1D;

    // Only one enable() flow can be in flight at a time (it is driven by a single button tap),
    // so a plain field is enough to carry the call across the activity-result round-trip.
    private PluginCall pendingCall;

    @PluginMethod
    public void enable(PluginCall call) {
        LocationRequest request =
                new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10_000L).build();
        LocationSettingsRequest settingsRequest = new LocationSettingsRequest.Builder()
                .addLocationRequest(request)
                .setAlwaysShow(true)
                .build();

        SettingsClient client = LocationServices.getSettingsClient(getContext());
        Task<?> task = client.checkLocationSettings(settingsRequest);

        task.addOnSuccessListener(response -> resolveEnabled(call, true));
        task.addOnFailureListener(exception -> {
            if (exception instanceof ResolvableApiException) {
                try {
                    IntentSender sender =
                            ((ResolvableApiException) exception).getResolution().getIntentSender();
                    pendingCall = call;
                    getActivity().startIntentSenderForResult(sender, REQUEST_ENABLE_LOCATION, null, 0, 0, 0);
                } catch (IntentSender.SendIntentException | NullPointerException error) {
                    pendingCall = null;
                    resolveEnabled(call, false);
                }
            } else {
                // Location settings can't be fixed by a dialog on this device.
                resolveEnabled(call, false);
            }
        });
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_ENABLE_LOCATION) return;
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call == null) return;
        resolveEnabled(call, resultCode == Activity.RESULT_OK);
    }

    private void resolveEnabled(PluginCall call, boolean enabled) {
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        call.resolve(result);
    }
}
