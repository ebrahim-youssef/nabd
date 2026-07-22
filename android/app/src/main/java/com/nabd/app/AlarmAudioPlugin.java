package com.nabd.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Creates notification channels whose sound plays through the phone's ALARM audio stream
 * (AudioAttributes.USAGE_ALARM), so the adhan is heard even on silent/vibrate (NBD-64).
 *
 * @capacitor/local-notifications' createChannel can't set a channel's audio usage, and a
 * channel's AudioAttributes are fixed at creation — so these are a parallel set of "-alarm"
 * channels, created here and scheduled onto only when the user turns the silent-mode switch on.
 * No Do-Not-Disturb override: USAGE_ALARM rides the alarm stream, which silent mode leaves alone.
 */
@CapacitorPlugin(name = "AlarmAudio")
public class AlarmAudioPlugin extends Plugin {

    @PluginMethod
    public void ensureAlarmChannels(PluginCall call) {
        // NotificationChannel is API 26+. On 23–25 the sound rides the notification itself and
        // there is nothing to configure here, so this is a no-op.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.resolve();
            return;
        }

        JSArray channels = call.getArray("channels");
        if (channels == null) {
            call.resolve();
            return;
        }

        NotificationManager manager =
                (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        String packageName = getContext().getPackageName();

        try {
            for (int i = 0; i < channels.length(); i++) {
                JSONObject spec = channels.getJSONObject(i);
                String id = spec.getString("id");
                String name = spec.getString("name");
                String sound = spec.getString("sound");

                Uri soundUri = Uri.parse("android.resource://" + packageName + "/raw/" + sound);
                NotificationChannel channel =
                        new NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH);
                channel.setSound(soundUri, attributes);
                channel.enableVibration(true);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(channel);
            }
        } catch (JSONException error) {
            call.reject("Invalid alarm channel spec", error);
            return;
        }

        call.resolve();
    }
}
