plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "app.tonustudy.vercel.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.tonustudy.vercel.app"
        minSdk = 23
        targetSdk = 36
        versionCode = 3
        versionName = "2.1.0"

        buildConfigField(
            "String",
            "WEB_CLIENT_ID",
            "\"663585592404-j277r3es9r4vcsj1227pmqkusu7pr7en.apps.googleusercontent.com\""
        )
        buildConfigField("String", "APP_URL", "\"https://tonustudy.vercel.app/\"")
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        val keystorePath = System.getenv("TONU_KEYSTORE_PATH")
        if (!keystorePath.isNullOrBlank()) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("TONU_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("TONU_KEY_ALIAS")
                keyPassword = System.getenv("TONU_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.findByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.1")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.webkit:webkit:1.13.0")
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
}
