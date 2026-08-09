package com.nabd.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.time.chrono.HijrahChronology;
import java.time.chrono.HijrahDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public final class CountdownFormatter {

    private static final String CHANNEL_ID = "prayer-countdown";
    private static final int NOTIFICATION_ID = 424242;
    private static final long AFTER_WINDOW_MS = 30 * 60 * 1000;

    private static final String PREFS_NAME = "nabd.countdown";
    private static final String KEY_BOUNDARIES = "boundaries";
    private static final String KEY_CITY = "city";

    private static final String[] ARABIC_DIGITS = {
        "٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"
    };

    private CountdownFormatter() {}

    private static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "العدّ التنازلي",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setSound(null, null);
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    public static void post(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, 0);
        String json = prefs.getString(KEY_BOUNDARIES, null);
        if (json == null || json.isEmpty()) {
            cancel(ctx);
            return;
        }

        String countdown;
        try {
            countdown = text(new JSONArray(json), System.currentTimeMillis());
        } catch (Exception e) {
            countdown = null;
        }
        if (countdown == null) {
            cancel(ctx);
            return;
        }

        ensureChannel(ctx);

        PendingIntent contentIntent =
            PendingIntent.getActivity(
                ctx,
                0,
                new Intent(ctx, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String header = buildTitle(ctx);
        NotificationCompat.Builder builder =
            new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(ctx.getApplicationInfo().icon)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .setContentIntent(contentIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if (header != null) {
            builder.setContentTitle(header)
                   .setContentText(countdown)
                   .setStyle(new NotificationCompat.BigTextStyle().bigText(countdown));
        } else {
            builder.setContentTitle(countdown);
        }

        NotificationManagerCompat.from(ctx).notify(NOTIFICATION_ID, builder.build());
    }

    public static void cancel(Context ctx) {
        NotificationManagerCompat.from(ctx).cancel(NOTIFICATION_ID);
    }

    static String hijriToday() {
        if (Build.VERSION.SDK_INT < 26) return null;
        try {
            HijrahDate today = HijrahDate.now();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d MMMM yyyy", new Locale("ar"))
                .withChronology(HijrahChronology.INSTANCE);
            return normalizeDigits(today.format(formatter));
        } catch (Exception e) {
            return null;
        }
    }

    static String buildTitle(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, 0);
        String city = prefs.getString(KEY_CITY, null);
        String hijri = hijriToday();
        if (hijri != null && city != null) return hijri + " | " + city;
        if (hijri != null) return hijri;
        if (city != null) return city;
        return null;
    }

    private static String normalizeDigits(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c >= '0' && c <= '9') {
                sb.append(ARABIC_DIGITS[c - '0']);
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    static String text(JSONArray boundaries, long now) throws JSONException {
        int len = boundaries.length();
        if (len == 0) return null;

        JSONObject[] sorted = new JSONObject[len];
        for (int i = 0; i < len; i++) sorted[i] = boundaries.getJSONObject(i);
        java.util.Arrays.sort(sorted, (a, b) -> Long.compare(a.optLong("at"), b.optLong("at")));

        // "since" — most recent point within AFTER_WINDOW_MS
        for (int i = sorted.length - 1; i >= 0; i--) {
            JSONObject point = sorted[i];
            long at = point.optLong("at");
            if (at <= now && now - at <= AFTER_WINDOW_MS) {
                int minutes = (int) ((now - at) / 60000);
                String since = minutes <= 1 ? "منذ دقيقة" : "منذ " + arabic(minutes) + " دقيقة";
                boolean sunrise = point.optBoolean("sunrise");
                if (sunrise) {
                    return "الشروق " + since;
                }
                return "أذّن " + point.optString("label") + " " + since;
            }
        }

        // "until" — first point after now
        for (int i = 0; i < len; i++) {
            JSONObject point = sorted[i];
            long at = point.optLong("at");
            if (at > now) {
                String target = point.optBoolean("sunrise") ? "الشروق" : point.optString("label");
                return "باقي " + duration(at - now) + " على " + target;
            }
        }

        return null;
    }

    private static String duration(long ms) {
        long totalMinutes = Math.max(1, (ms + 59_999) / 60_000);
        long hours = totalMinutes / 60;
        long minutes = totalMinutes % 60;

        if (hours == 0) return arabic((int) minutes) + " دقيقة";

        String hourPart;
        if (hours == 1) {
            hourPart = "ساعة";
        } else if (hours == 2) {
            hourPart = "ساعتين";
        } else {
            hourPart = arabic((int) hours) + " ساعات";
        }

        if (minutes == 0) return hourPart;
        return hourPart + " و" + arabic((int) minutes) + " دقيقة";
    }

    private static String arabic(int n) {
        String s = String.valueOf(n);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c >= '0' && c <= '9') {
                sb.append(ARABIC_DIGITS[c - '0']);
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}