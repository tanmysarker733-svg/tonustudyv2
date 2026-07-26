package app.tonustudy.vercel.app

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.credentials.CustomCredential
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.lifecycle.lifecycleScope
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var refreshLayout: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var launchBrand: ImageView
    private lateinit var credentialManager: CredentialManager
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var lastTrustedUrl = BuildConfig.APP_URL

    private val filePicker = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = fileCallback ?: return@registerForActivityResult
        val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        callback.onReceiveValue(uris)
        fileCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        credentialManager = CredentialManager.create(this)

        val root = FrameLayout(this)
        refreshLayout = SwipeRefreshLayout(this)
        webView = WebView(this)
        launchBrand = ImageView(this).apply {
            setImageResource(R.drawable.tonu_study_brand)
            scaleType = ImageView.ScaleType.FIT_CENTER
            setBackgroundColor(Color.rgb(7, 19, 27))
            contentDescription = getString(R.string.app_name)
            setPadding(
                resources.displayMetrics.density.times(32).toInt(),
                resources.displayMetrics.density.times(32).toInt(),
                resources.displayMetrics.density.times(32).toInt(),
                resources.displayMetrics.density.times(32).toInt()
            )
        }
        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
        }

        refreshLayout.addView(
            webView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        root.addView(
            refreshLayout,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        root.addView(
            launchBrand,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        root.addView(
            progressBar,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                resources.displayMetrics.density.times(3).toInt()
            )
        )
        setContentView(root)

        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.updatePadding(top = bars.top, bottom = bars.bottom)
            insets
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            // The deployed site is the single source of truth. Normal HTTP cache
            // keeps repeat launches light while the server controls freshness.
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false
            allowContentAccess = false
            mediaPlaybackRequiresUserGesture = true
            setSupportMultipleWindows(false)
        }
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }
        webView.addJavascriptInterface(AndroidBridge(), "TonuAndroid")
        webView.webViewClient = TonuWebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, progress: Int) {
                progressBar.progress = progress
                progressBar.visibility = if (progress >= 100) android.view.View.GONE else android.view.View.VISIBLE
                if (progress >= 100) {
                    refreshLayout.isRefreshing = false
                    launchBrand.animate().alpha(0f).setDuration(180).withEndAction {
                        launchBrand.visibility = android.view.View.GONE
                    }.start()
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = filePathCallback
                val intent = fileChooserParams?.createIntent()
                    ?: Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        type = "*/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    }
                return runCatching {
                    filePicker.launch(intent)
                    true
                }.getOrElse {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = null
                    false
                }
            }
        }

        refreshLayout.setOnRefreshListener {
            webView.reload()
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    webView.canGoBack() -> webView.goBack()
                    else -> finish()
                }
            }
        })

        val initialUrl = intent?.data?.takeIf(::isTrustedUri)?.toString() ?: BuildConfig.APP_URL
        if (!hasInternetConnection()) {
            Toast.makeText(
                this,
                "No internet connection. Connect to the internet to open TONU STUDY.",
                Toast.LENGTH_LONG
            ).show()
        }
        webView.loadUrl(initialUrl)
    }

    override fun onDestroy() {
        fileCallback?.onReceiveValue(null)
        fileCallback = null
        webView.apply {
            removeJavascriptInterface("TonuAndroid")
            stopLoading()
            clearHistory()
            destroy()
        }
        super.onDestroy()
    }

    private inner class AndroidBridge {
        @JavascriptInterface
        fun signInWithGoogle() {
            if (!isTrustedUri(Uri.parse(webView.url ?: ""))) {
                deliverGoogleResult(false, error = "Google sign-in is only available on Tonu Study.")
                return
            }
            if (!hasInternetConnection()) {
                deliverGoogleResult(
                    false,
                    error = "No internet connection. Please connect to the internet and try again."
                )
                return
            }
            try {
                runOnUiThread {
                    runCatching { startGoogleSignIn() }
                        .onFailure {
                            deliverGoogleResult(
                                false,
                                error = "Google sign-in could not start in this app build. Please update the app and try again."
                            )
                        }
                }
            } catch (_: Exception) {
                deliverGoogleResult(
                    false,
                    error = "Google sign-in could not start in this app build. Please update the app and try again."
                )
            }
        }

        @JavascriptInterface
        fun retry() {
            runOnUiThread { webView.loadUrl(lastTrustedUrl) }
        }

        @JavascriptInterface
        fun isOnline(): Boolean = hasInternetConnection()

        @JavascriptInterface
        fun openExternal(url: String) {
            val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return
            if (uri.scheme == "https") runOnUiThread { openExternalUri(uri) }
        }
    }

    private fun startGoogleSignIn() {
        lifecycleScope.launch {
            try {
                val googleOption = GetSignInWithGoogleOption.Builder(BuildConfig.WEB_CLIENT_ID).build()
                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleOption)
                    .build()
                val result = credentialManager.getCredential(
                    context = this@MainActivity,
                    request = request
                )
                val credential = result.credential
                if (
                    credential is CustomCredential &&
                    credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    deliverGoogleResult(true, token = googleCredential.idToken)
                } else {
                    deliverGoogleResult(false, error = "Android returned an unsupported credential.")
                }
            } catch (_: GetCredentialCancellationException) {
                deliverGoogleResult(false, error = "Google sign-in was cancelled.")
            } catch (_: GetCredentialException) {
                deliverGoogleResult(
                    false,
                    error = "Google sign-in could not continue. Check your Google Play services and app configuration, then try again."
                )
            } catch (_: Exception) {
                deliverGoogleResult(
                    false,
                    error = "Google sign-in could not continue. Please update the app and try again."
                )
            }
        }
    }

    private fun deliverGoogleResult(success: Boolean, token: String? = null, error: String? = null) {
        val payload = JSONObject()
            .put("ok", success)
            .put("idToken", token ?: JSONObject.NULL)
            .put("error", error ?: JSONObject.NULL)
            .toString()
        runOnUiThread {
            webView.evaluateJavascript(
                "window.__tonuNativeGoogleResult && window.__tonuNativeGoogleResult($payload);",
                null
            )
        }
    }

    private inner class TonuWebViewClient : WebViewClient() {
        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
            url?.let { candidate ->
                if (isTrustedUri(Uri.parse(candidate))) lastTrustedUrl = candidate
            }
        }

        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest): Boolean {
            val uri = request.url
            return if (isTrustedUri(uri)) {
                false
            } else {
                openExternalUri(uri)
                true
            }
        }

        override fun onReceivedError(
            view: WebView,
            request: WebResourceRequest,
            error: WebResourceError
        ) {
            if (request.isForMainFrame) {
                refreshLayout.isRefreshing = false
                launchBrand.visibility = android.view.View.GONE
                Toast.makeText(
                    this@MainActivity,
                    if (hasInternetConnection()) {
                        "TONU STUDY could not load. Pull down to retry."
                    } else {
                        "No internet connection. Connect and pull down to retry."
                    },
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun hasInternetConnection(): Boolean {
        val manager = getSystemService(ConnectivityManager::class.java) ?: return false
        val network = manager.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun isTrustedUri(uri: Uri): Boolean =
        uri.scheme == "https" && uri.host.equals(TRUSTED_HOST, ignoreCase = true)

    private fun openExternalUri(uri: Uri) {
        if (uri.scheme !in setOf("https", "mailto", "tel")) return
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
    }

    companion object {
        private const val TRUSTED_HOST = "tonustudy.vercel.app"
    }
}
