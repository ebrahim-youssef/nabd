package com.nabd.capabilities

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.IntentSender
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.LocationSettingsRequest
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.interfaces.permissions.PermissionsResponseListener
import expo.modules.interfaces.permissions.PermissionsStatus
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class NabdDeviceCapabilitiesModule : Module() {
  private var locationPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("NabdDeviceCapabilities")

    AsyncFunction("getCapabilityStatus") { promise: Promise ->
      val context = appContext.reactContext ?: return@AsyncFunction promise.reject("ERR_CONTEXT", "React context unavailable", null)
      val permissions = appContext.permissions ?: return@AsyncFunction promise.reject("ERR_PERMISSIONS", "Permission manager unavailable", null)
      val requested = mutableListOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) requested.add(Manifest.permission.POST_NOTIFICATIONS)
      permissions.getPermissions(PermissionsResponseListener { responses ->
      val alarmManager = context.getSystemService(AlarmManager::class.java)
      val alarmPrefs = context.getSharedPreferences(CapabilityConstants.ALARM_PREFS, 0)
      val channelState = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) "ready" else alarmPrefs.getString(CapabilityConstants.CHANNEL_STATE, "notCreated")
      val notification = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) "granted" else responseState(responses[Manifest.permission.POST_NOTIFICATIONS])
      val coarse = responses[Manifest.permission.ACCESS_COARSE_LOCATION]
      val fine = responses[Manifest.permission.ACCESS_FINE_LOCATION]
      val location = if (coarse?.status == PermissionsStatus.GRANTED || fine?.status == PermissionsStatus.GRANTED) "granted"
        else if (coarse?.status == PermissionsStatus.UNDETERMINED && fine?.status == PermissionsStatus.UNDETERMINED) "notAsked"
        else if (coarse?.canAskAgain == false && fine?.canAskAgain == false) "permanentlyDenied" else "denied"
      promise.resolve(mapOf(
        "notificationPermission" to notification,
        "notificationsEnabled" to NotificationManagerCompat.from(context).areNotificationsEnabled(),
        "exactAlarmAccess" to (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()),
        "alarmChannels" to channelState,
        "countdownEnabled" to context.getSharedPreferences(CapabilityConstants.COUNTDOWN_PREFS, 0).contains(CapabilityConstants.COUNTDOWN_BOUNDARIES),
        "locationPermission" to location,
        "locationServicesEnabled" to locationServicesEnabled(context)
      ))
      }, *requested.toTypedArray())
    }

    AsyncFunction("requestNotificationPermission") { promise: Promise ->
      val context = appContext.reactContext ?: return@AsyncFunction promise.reject("ERR_CONTEXT", "React context unavailable", null)
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return@AsyncFunction promise.resolve(mapOf("permission" to "granted", "canAskAgain" to false))
      val permissions = appContext.permissions ?: return@AsyncFunction promise.reject("ERR_PERMISSIONS", "Permission manager unavailable", null)
      permissions.askForPermissions(PermissionsResponseListener { responses ->
        val response = responses[Manifest.permission.POST_NOTIFICATIONS]
        promise.resolve(mapOf("permission" to responseState(response), "canAskAgain" to (response?.canAskAgain ?: false)))
      }, Manifest.permission.POST_NOTIFICATIONS)
    }

    AsyncFunction("openApplicationSettings") {
      val context = appContext.reactContext ?: error("React context unavailable")
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    AsyncFunction("openExactAlarmSettings") {
      val context = appContext.reactContext ?: error("React context unavailable")
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val intent = Intent(
          Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
          Uri.parse("package:${context.packageName}")
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
          context.startActivity(intent)
        } catch (_: ActivityNotFoundException) {
          context.startActivity(
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
              .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          )
        }
      }
    }

    AsyncFunction("armAlarms") { options: Map<String, Any?> ->
      val context = appContext.reactContext ?: error("React context unavailable")
      val alarmOnSilent = options["alarmOnSilent"] as? Boolean ?: false
      val payloads = JSONArray()
      @Suppress("UNCHECKED_CAST")
      (options["alarms"] as? List<Map<String, Any?>>).orEmpty().forEach { item ->
        payloads.put(JSONObject().put("id", (item["id"] as Number).toInt()).put("title", item["title"])
          .put("body", item["body"]).put("channelKey", item["channelKey"]).put("at", (item["at"] as Number).toLong()))
      }
      val degraded = AlarmSupport.ensureChannels(context, alarmOnSilent)
      AlarmSupport.replace(context, payloads, alarmOnSilent && !degraded)
      mapOf("degraded" to degraded)
    }

    AsyncFunction("cancelAlarms") { AlarmSupport.cancel(appContext.reactContext ?: error("React context unavailable")) }

    AsyncFunction("enableCountdown") { options: Map<String, Any?> ->
      val context = appContext.reactContext ?: error("React context unavailable")
      val boundaries = JSONArray()
      @Suppress("UNCHECKED_CAST")
      (options["boundaries"] as? List<Map<String, Any?>>).orEmpty().forEach { item ->
        boundaries.put(JSONObject().put("at", (item["at"] as Number).toLong()).put("label", item["label"]).put("sunrise", item["sunrise"] ?: false))
      }
      val editor = context.getSharedPreferences(CapabilityConstants.COUNTDOWN_PREFS, 0).edit().putString(CapabilityConstants.COUNTDOWN_BOUNDARIES, boundaries.toString())
      (options["city"] as? String)?.let { editor.putString(CapabilityConstants.COUNTDOWN_CITY, it) } ?: editor.remove(CapabilityConstants.COUNTDOWN_CITY)
      editor.apply()
      CountdownSupport.post(context)
      val request = PeriodicWorkRequestBuilder<CountdownWorker>(15, TimeUnit.MINUTES).build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(CapabilityConstants.COUNTDOWN_WORK, ExistingPeriodicWorkPolicy.UPDATE, request)
    }

    AsyncFunction("disableCountdown") {
      val context = appContext.reactContext ?: error("React context unavailable")
      WorkManager.getInstance(context).cancelUniqueWork(CapabilityConstants.COUNTDOWN_WORK)
      CountdownSupport.cancel(context)
      context.getSharedPreferences(CapabilityConstants.COUNTDOWN_PREFS, 0).edit().remove(CapabilityConstants.COUNTDOWN_BOUNDARIES).remove(CapabilityConstants.COUNTDOWN_CITY).apply()
    }

    AsyncFunction("ensureLocationServices") { promise: Promise -> ensureLocationServices(promise) }

    AsyncFunction("requestLocation") { promise: Promise -> requestLocation(promise) }

    OnActivityResult { _, result ->
      if (result.requestCode == CapabilityConstants.GPS_REQUEST) {
        locationPromise?.resolve(mapOf("enabled" to (result.resultCode == Activity.RESULT_OK)))
        locationPromise = null
      }
    }
  }

  private fun requestLocation(promise: Promise) {
    val context = appContext.reactContext
      ?: return promise.reject("ERR_CONTEXT", "React context unavailable", null)
    val permissions = appContext.permissions
      ?: return promise.reject("ERR_PERMISSIONS", "Permission manager unavailable", null)
    val requested = arrayOf(
      Manifest.permission.ACCESS_COARSE_LOCATION,
      Manifest.permission.ACCESS_FINE_LOCATION
    )
    permissions.askForPermissions(PermissionsResponseListener { responses ->
      val coarse = responses[Manifest.permission.ACCESS_COARSE_LOCATION]
      val fine = responses[Manifest.permission.ACCESS_FINE_LOCATION]
      if (coarse?.status != PermissionsStatus.GRANTED && fine?.status != PermissionsStatus.GRANTED) {
        val permanent = coarse?.canAskAgain == false && fine?.canAskAgain == false
        promise.resolve(mapOf("ok" to false, "reason" to if (permanent) "permanentlyDenied" else "denied"))
        return@PermissionsResponseListener
      }

      val request = CurrentLocationRequest.Builder()
        .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
        .setDurationMillis(15_000L)
        .setMaxUpdateAgeMillis(600_000L)
        .build()
      val cancellation = CancellationTokenSource()
      try {
        LocationServices.getFusedLocationProviderClient(context)
          .getCurrentLocation(request, cancellation.token)
          .addOnSuccessListener { location ->
            if (location == null) {
              promise.resolve(cachedLocation(context))
              return@addOnSuccessListener
            }
            context.getSharedPreferences(CapabilityConstants.LOCATION_PREFS, 0).edit()
              .putLong(CapabilityConstants.LOCATION_LATITUDE, location.latitude.toBits())
              .putLong(CapabilityConstants.LOCATION_LONGITUDE, location.longitude.toBits())
              .apply()
            promise.resolve(mapOf(
              "ok" to true,
              "coords" to mapOf("latitude" to location.latitude, "longitude" to location.longitude),
              "cached" to false
            ))
          }
          .addOnFailureListener { promise.resolve(cachedLocation(context)) }
      } catch (_: SecurityException) {
        promise.resolve(mapOf("ok" to false, "reason" to "denied"))
      }
    }, *requested)
  }

  private fun cachedLocation(context: Context): Map<String, Any> {
    val prefs = context.getSharedPreferences(CapabilityConstants.LOCATION_PREFS, 0)
    if (!prefs.contains(CapabilityConstants.LOCATION_LATITUDE) ||
      !prefs.contains(CapabilityConstants.LOCATION_LONGITUDE)) {
      return mapOf("ok" to false, "reason" to "unavailable")
    }
    val latitude = Double.fromBits(prefs.getLong(CapabilityConstants.LOCATION_LATITUDE, 0L))
    val longitude = Double.fromBits(prefs.getLong(CapabilityConstants.LOCATION_LONGITUDE, 0L))
    return mapOf(
      "ok" to true,
      "coords" to mapOf("latitude" to latitude, "longitude" to longitude),
      "cached" to true
    )
  }

  private fun ensureLocationServices(promise: Promise) {
    val context = appContext.reactContext ?: return promise.reject("ERR_CONTEXT", "React context unavailable", null)
    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10_000L).build()
    val settings = LocationSettingsRequest.Builder().addLocationRequest(request).setAlwaysShow(true).build()
    LocationServices.getSettingsClient(context).checkLocationSettings(settings)
      .addOnSuccessListener { promise.resolve(mapOf("enabled" to true)) }
      .addOnFailureListener { error ->
        if (error !is ResolvableApiException) return@addOnFailureListener promise.resolve(mapOf("enabled" to false))
        val activity = appContext.currentActivity ?: return@addOnFailureListener promise.resolve(mapOf("enabled" to false))
        try {
          locationPromise?.resolve(mapOf("enabled" to false))
          locationPromise = promise
          activity.startIntentSenderForResult(error.resolution.intentSender, CapabilityConstants.GPS_REQUEST, null, 0, 0, 0)
        } catch (_: IntentSender.SendIntentException) { locationPromise = null; promise.resolve(mapOf("enabled" to false)) }
      }
  }

  private fun responseState(response: expo.modules.interfaces.permissions.PermissionsResponse?): String = when {
    response?.status == PermissionsStatus.GRANTED -> "granted"
    response?.status == PermissionsStatus.UNDETERMINED -> "notAsked"
    response?.canAskAgain == false -> "permanentlyDenied"
    else -> "denied"
  }

  private fun locationServicesEnabled(context: Context): Boolean {
    val manager = context.getSystemService(LocationManager::class.java) ?: return false
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) manager.isLocationEnabled else manager.isProviderEnabled(LocationManager.GPS_PROVIDER) || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
  }
}
