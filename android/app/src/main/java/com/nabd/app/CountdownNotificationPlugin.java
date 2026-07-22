package com.nabd.app;

import android.content.SharedPreferences;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "CountdownNotification")
public class CountdownNotificationPlugin extends Plugin {

    private static final String PREFS_NAME = "nabd.countdown";
    private static final String KEY_BOUNDARIES = "boundaries";
    private static final String KEY_CITY = "city";
    private static final String WORK_NAME = "nabd-countdown";

    @PluginMethod
    public void enable(PluginCall call) {
        String boundaries = call.getArray("boundaries").toString();
        String city = call.getString("city", null);
        SharedPreferences.Editor editor = getContext()
            .getSharedPreferences(PREFS_NAME, 0)
            .edit()
            .putString(KEY_BOUNDARIES, boundaries);
        if (city != null) {
            editor.putString(KEY_CITY, city);
        } else {
            editor.remove(KEY_CITY);
        }
        editor.apply();

        CountdownFormatter.post(getContext());

        PeriodicWorkRequest req =
            new PeriodicWorkRequest.Builder(CountdownWorker.class, 15, TimeUnit.MINUTES).build();
        WorkManager.getInstance(getContext())
            .enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, req);

        call.resolve();
    }

    @PluginMethod
    public void disable(PluginCall call) {
        WorkManager.getInstance(getContext()).cancelUniqueWork(WORK_NAME);
        CountdownFormatter.cancel(getContext());
        getContext().getSharedPreferences(PREFS_NAME, 0).edit().remove(KEY_BOUNDARIES).remove(KEY_CITY).apply();
        call.resolve();
    }
}
