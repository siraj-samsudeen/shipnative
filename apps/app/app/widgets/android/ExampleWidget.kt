//
//  ExampleWidget.kt
//  Example Widget for ShipNative
//
//  This widget demonstrates how to fetch and display data from Supabase
//  in a native Android widget using Kotlin.
//

package com.reactnativestarterkit.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import android.util.Log
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.text.SimpleDateFormat
import java.util.*

/**
 * Example Widget Provider
 * 
 * Fetches data from Supabase and displays it in a home screen widget.
 */
class ExampleWidgetProvider : AppWidgetProvider() {
    
    companion object {
        private const val TAG = "ExampleWidget"
        private const val PREFS_NAME = "widget_prefs"
        private const val SUPABASE_URL_KEY = "supabase_url"
        private const val SUPABASE_KEY_KEY = "supabase_key"
        private const val SESSION_TOKEN_KEY = "supabase_session_token"
        
        // Update widget
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
                
                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }
        
        /**
         * Fetch data from Supabase
         * In a real implementation, you would make an HTTP request to Supabase REST API
         */
        private fun fetchWidgetData(
            supabaseUrl: String,
            supabaseKey: String,
            sessionToken: String?,
            callback: (Result<WidgetData>) -> Unit
        ) {
            // Execute on background thread
            Executors.newSingleThreadExecutor().execute {
                try {
                    // Example: Fetch user profile data
                    // In a real implementation, you would:
                    // 1. Create HTTP request to Supabase REST API endpoint
                    // 2. Add Authorization header if sessionToken is available
                    // 3. Add apikey header with supabaseKey
                    // 4. Make the request
                    // 5. Parse JSON response
                    
                    // For this example, we'll simulate the data fetch
                    Thread.sleep(500) // Simulate network delay
                    
                    val mockData = WidgetData(
                        title = "Example Widget",
                        subtitle = "Data from Supabase",
                        count = 42,
                        status = "active"
                    )
                    
                    callback(Result.Success(mockData))
                } catch (e: Exception) {
                    Log.e(TAG, "Error fetching widget data", e)
                    callback(Result.Error("Failed to load data: ${e.message}"))
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
    
    override fun onEnabled(context: Context) {
        // Widget enabled
        Log.d(TAG, "Widget enabled")
    }
    
    override fun onDisabled(context: Context) {
        // Widget disabled
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










