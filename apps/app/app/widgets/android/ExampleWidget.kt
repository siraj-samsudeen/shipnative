//
//  ExampleWidget.kt
//  Example Widget for Shipnative
//
//  This widget demonstrates how to fetch and display data from Supabase
//  in a native Android widget using Kotlin.
//

package com.reactnativestarterkit.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.text.SimpleDateFormat
import java.util.*

/**
 * Example Widget Provider
 *
 * Fetches data from Supabase REST API and displays it in a home screen widget.
 * Supports click actions for refresh and opening the app.
 */
class ExampleWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "ExampleWidget"
        private const val PREFS_NAME = "widget_prefs"
        private const val SUPABASE_URL_KEY = "supabase_url"
        private const val SUPABASE_KEY_KEY = "supabase_key"
        private const val SESSION_TOKEN_KEY = "supabase_session_token"

        // Click actions
        const val ACTION_REFRESH = "com.shipnative.widget.ACTION_REFRESH"
        const val ACTION_OPEN_APP = "com.shipnative.widget.ACTION_OPEN_APP"
        const val EXTRA_WIDGET_ID = "widget_id"

        // HTTP timeout in milliseconds
        private const val HTTP_TIMEOUT = 15000

        /**
         * Update widget with data from Supabase
         */
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            // Get shared preferences (shared with main app)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            // Get Supabase configuration
            val supabaseUrl = prefs.getString(SUPABASE_URL_KEY, null)
            val supabaseKey = prefs.getString(SUPABASE_KEY_KEY, null)
            val sessionToken = prefs.getString(SESSION_TOKEN_KEY, null)

            // Create RemoteViews
            val views = RemoteViews(context.packageName, R.layout.example_widget)

            // Set up click handlers
            setupClickHandlers(context, views, appWidgetId)

            // Fetch data from Supabase
            if (supabaseUrl != null && supabaseKey != null) {
                fetchWidgetData(supabaseUrl, supabaseKey, sessionToken) { result ->
                    when (result) {
                        is Result.Success -> {
                            // Update widget with data
                            views.setTextViewText(R.id.widget_title, result.data.title)
                            result.data.subtitle?.let {
                                views.setTextViewText(R.id.widget_subtitle, it)
                            }
                            result.data.count?.let {
                                views.setTextViewText(R.id.widget_count, it.toString())
                            }

                            // Update timestamp
                            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                            views.setTextViewText(
                                R.id.widget_timestamp,
                                "Updated: ${timeFormat.format(Date())}"
                            )

                            // Set error visibility to gone
                            views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
                            views.setViewVisibility(R.id.widget_content, android.view.View.VISIBLE)
                        }
                        is Result.Error -> {
                            // Show error
                            views.setTextViewText(R.id.widget_error, result.error)
                            views.setViewVisibility(R.id.widget_error, android.view.View.VISIBLE)
                            views.setViewVisibility(R.id.widget_content, android.view.View.GONE)
                        }
                    }

                    // Update the widget
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
            } else {
                // No Supabase config - show mock data
                views.setTextViewText(R.id.widget_title, "Example Widget")
                views.setTextViewText(R.id.widget_subtitle, "Mock Mode")
                views.setTextViewText(R.id.widget_count, "42")
                views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
                views.setViewVisibility(R.id.widget_content, android.view.View.VISIBLE)

                val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                views.setTextViewText(
                    R.id.widget_timestamp,
                    "Updated: ${timeFormat.format(Date())}"
                )

                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }

        /**
         * Set up click handlers for widget interactions
         */
        private fun setupClickHandlers(
            context: Context,
            views: RemoteViews,
            appWidgetId: Int
        ) {
            // Refresh button click - triggers widget update
            val refreshIntent = Intent(context, ExampleWidgetProvider::class.java).apply {
                action = ACTION_REFRESH
                putExtra(EXTRA_WIDGET_ID, appWidgetId)
            }
            val refreshPendingIntent = PendingIntent.getBroadcast(
                context,
                appWidgetId,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_refresh_button, refreshPendingIntent)

            // Main widget click - opens the app
            val openAppIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (openAppIntent != null) {
                openAppIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                val openAppPendingIntent = PendingIntent.getActivity(
                    context,
                    appWidgetId + 1000, // Unique request code
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_container, openAppPendingIntent)
            }
        }

        /**
         * Fetch data from Supabase REST API
         * Makes a real HTTP request to the Supabase endpoint
         */
        private fun fetchWidgetData(
            supabaseUrl: String,
            supabaseKey: String,
            sessionToken: String?,
            callback: (Result<WidgetData>) -> Unit
        ) {
            // Execute on background thread
            Executors.newSingleThreadExecutor().execute {
                var connection: HttpURLConnection? = null
                try {
                    // Build the URL for widget_entries table
                    val endpoint = "$supabaseUrl/rest/v1/widget_entries?select=title,subtitle,count&order=updated_at.desc&limit=1"
                    val url = URL(endpoint)

                    connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "GET"
                    connection.connectTimeout = HTTP_TIMEOUT
                    connection.readTimeout = HTTP_TIMEOUT

                    // Set required headers
                    connection.setRequestProperty("apikey", supabaseKey)
                    connection.setRequestProperty("Accept", "application/json")
                    connection.setRequestProperty("Content-Type", "application/json")

                    // Add authorization header if session token is available
                    if (!sessionToken.isNullOrEmpty()) {
                        connection.setRequestProperty("Authorization", "Bearer $sessionToken")
                    }

                    // Get response
                    val responseCode = connection.responseCode

                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        val reader = BufferedReader(InputStreamReader(connection.inputStream))
                        val response = StringBuilder()
                        var line: String?
                        while (reader.readLine().also { line = it } != null) {
                            response.append(line)
                        }
                        reader.close()

                        // Parse JSON response
                        val jsonArray = JSONArray(response.toString())
                        if (jsonArray.length() > 0) {
                            val jsonObject = jsonArray.getJSONObject(0)
                            val widgetData = WidgetData(
                                title = jsonObject.optString("title", "Widget"),
                                subtitle = jsonObject.optString("subtitle", null),
                                count = if (jsonObject.has("count")) jsonObject.getInt("count") else null,
                                status = "active"
                            )
                            callback(Result.Success(widgetData))
                        } else {
                            // No data found, return default
                            callback(Result.Success(WidgetData(
                                title = "No Data",
                                subtitle = "Add entries to widget_entries table",
                                count = 0,
                                status = "empty"
                            )))
                        }
                    } else {
                        // HTTP error
                        val errorStream = connection.errorStream
                        val errorMessage = if (errorStream != null) {
                            BufferedReader(InputStreamReader(errorStream)).use { it.readText() }
                        } else {
                            "HTTP $responseCode"
                        }
                        Log.e(TAG, "HTTP Error: $responseCode - $errorMessage")
                        callback(Result.Error("Server error: $responseCode"))
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error fetching widget data", e)
                    callback(Result.Error("Network error: ${e.localizedMessage}"))
                } finally {
                    connection?.disconnect()
                }
            }
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // Update all widgets
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_REFRESH -> {
                // Handle refresh click
                val appWidgetId = intent.getIntExtra(EXTRA_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    Log.d(TAG, "Refresh clicked for widget $appWidgetId")
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    updateAppWidget(context, appWidgetManager, appWidgetId)
                }
            }
            ACTION_OPEN_APP -> {
                // Handle open app click
                Log.d(TAG, "Open app clicked")
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                launchIntent?.let {
                    it.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    context.startActivity(it)
                }
            }
        }
    }

    override fun onEnabled(context: Context) {
        // Widget enabled for the first time
        Log.d(TAG, "Widget enabled")
    }

    override fun onDisabled(context: Context) {
        // Last widget instance removed
        Log.d(TAG, "Widget disabled")
    }
}

/**
 * Widget data model
 */
data class WidgetData(
    val title: String,
    val subtitle: String? = null,
    val count: Int? = null,
    val status: String? = null
)

/**
 * Result wrapper for async operations
 */
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val error: String) : Result<Nothing>()
}
