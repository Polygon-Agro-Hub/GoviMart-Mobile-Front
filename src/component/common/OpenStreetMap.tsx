import React, { useRef, useEffect, useState, useMemo } from "react";
import { View, StyleSheet, ActivityIndicator, StyleProp, ViewStyle } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

export interface MapMarker {
    id?: string | number;
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
    isOpen?: boolean;
    statusText?: string;
    statusColor?: string;
    timeText?: string;
    color?: string;
    autoOpenPopup?: boolean;
    showPopup?: boolean;
}

export interface OpenStreetMapProps {
    latitude: number;
    longitude: number;
    zoom?: number;
    interactive?: boolean;
    scrollEnabled?: boolean;
    zoomEnabled?: boolean;
    markers?: MapMarker[];
    pinColor?: string;
    onLocationSelect?: (coord: { latitude: number; longitude: number }) => void;
    onMarkerSelect?: (id: string | number) => void;
    style?: StyleProp<ViewStyle>;
}

export const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
    latitude,
    longitude,
    zoom = 15,
    interactive = true,
    scrollEnabled = true,
    zoomEnabled = true,
    markers,
    pinColor = "#FF0000",
    onLocationSelect,
    onMarkerSelect,
    style,
}) => {
    const webViewRef = useRef<WebView>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    // Build the initial HTML with Leaflet and OpenStreetMap
    const htmlContent = useMemo(() => {
        const markerList = markers && markers.length > 0
            ? markers
            : [{ latitude, longitude, color: pinColor, autoOpenPopup: false, showPopup: false }];

        const markersJson = JSON.stringify(markerList);
        const canSelectLocation = Boolean(onLocationSelect);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
    <style>
        html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #F8FAFC;
        }
        .leaflet-control-attribution {
            font-size: 8px !important;
            opacity: 0.6;
        }
        .custom-pin {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .leaflet-popup-content-wrapper {
            background: #FFFFFF !important;
            border-radius: 14px !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
            padding: 2px 4px !important;
            border: none !important;
        }
        .leaflet-popup-content {
            margin: 10px 14px !important;
            line-height: 1.35 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        .leaflet-popup-tip-container {
            width: 20px !important;
            height: 10px !important;
            margin-top: -1px !important;
        }
        .leaflet-popup-tip {
            background: #FFFFFF !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
            width: 12px !important;
            height: 12px !important;
            padding: 1px !important;
            margin: -6px auto 0 !important;
        }
        .leaflet-container a.leaflet-popup-close-button {
            display: none !important;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map;
        var activeMarkers = [];
        var isInteractive = ${interactive};
        var canSelectLocation = ${canSelectLocation};
        var currentPinColor = "${pinColor}";

        function createPinIcon(color) {
            var pinCol = color || currentPinColor || '#FF0000';
            var svgHtml = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 24 32" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">' +
                '<path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 20 12 20s12-11.5 12-20c0-6.63-5.37-12-12-12z" fill="' + pinCol + '" />' +
                '<circle cx="12" cy="11" r="4.2" fill="#FFFFFF" />' +
                '</svg>';
            return L.divIcon({
                className: 'custom-pin',
                html: svgHtml,
                iconSize: [30, 38],
                iconAnchor: [15, 36],
                popupAnchor: [0, -34]
            });
        }

        function buildPopupHtml(m) {
            var title = m.title || '';
            var hasStatus = Boolean(m.statusText);
            var hasTime = Boolean(m.timeText || m.description);

            var extraInfoHtml = '';
            if (hasStatus || hasTime) {
                var isOpen = m.isOpen !== undefined ? m.isOpen : true;
                var statusText = m.statusText || (isOpen ? 'Open' : 'Closed');
                var statusColor = m.statusColor || (isOpen ? '#FF9114' : '#FF2D55');
                var dotColor = isOpen ? '#FF9114' : '#94A3B8';
                var timeText = m.timeText || m.description || '';

                extraInfoHtml = '<div style="font-size: 13px; display: flex; align-items: center; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, \\'Segoe UI\\', Roboto, sans-serif;">' +
                   (hasStatus ? '<span style="color:' + statusColor + '; font-weight: 700; margin-right: 5px;">' + statusText + '</span>' : '') +
                   (hasStatus && hasTime ? '<span style="color:' + dotColor + '; font-weight: 700; margin-right: 5px;">•</span>' : '') +
                   (hasTime ? '<span style="color: #475569; font-weight: 500;">' + timeText + '</span>' : '') +
                   '</div>';
            }

            return '<div style="text-align: left; min-width: 120px; padding: 2px 2px;">' +
                   '<div style="font-size: 15px; font-weight: 700; color: #000000; margin-bottom: ' + (extraInfoHtml ? '4px' : '0px') + '; letter-spacing: -0.2px; font-family: -apple-system, BlinkMacSystemFont, \\'Segoe UI\\', Roboto, sans-serif;">' + title + '</div>' +
                   extraInfoHtml +
                   '</div>';
        }

        function initMap() {
            try {
                map = L.map('map', {
                    center: [${latitude}, ${longitude}],
                    zoom: ${zoom},
                    zoomControl: ${zoomEnabled && interactive},
                    dragging: ${scrollEnabled && interactive},
                    touchZoom: ${zoomEnabled && interactive},
                    doubleClickZoom: ${zoomEnabled && interactive},
                    scrollWheelZoom: ${scrollEnabled && interactive},
                    boxZoom: false,
                    keyboard: false
                });

                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                }).addTo(map);

                var initialMarkers = ${markersJson};
                setMarkers(initialMarkers);

                if (isInteractive && canSelectLocation) {
                    map.on('click', function(e) {
                        var lat = e.latlng.lat;
                        var lng = e.latlng.lng;
                        
                        clearMarkers();
                        var newMarker = L.marker([lat, lng], { icon: createPinIcon(currentPinColor) }).addTo(map);
                        activeMarkers.push(newMarker);

                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'onLocationSelect',
                                latitude: lat,
                                longitude: lng
                            }));
                        }
                    });
                }

                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'onMapReady' }));
                }
            } catch (err) {
                console.error("Map init error:", err);
            }
        }

        function clearMarkers() {
            for (var i = 0; i < activeMarkers.length; i++) {
                map.removeLayer(activeMarkers[i]);
            }
            activeMarkers = [];
        }

        function setMarkers(markerData) {
            clearMarkers();
            if (!markerData || !markerData.length) return;

            for (var i = 0; i < markerData.length; i++) {
                (function(m) {
                    var marker = L.marker([m.latitude, m.longitude], {
                        icon: createPinIcon(m.color || currentPinColor)
                    }).addTo(map);

                    var shouldShowPopup = m.showPopup !== false && (m.title || m.description || m.statusText);

                    if (shouldShowPopup) {
                        var popupHtml = buildPopupHtml(m);
                        marker.bindPopup(popupHtml, {
                            closeButton: false,
                            autoClose: markerData.length === 1 ? false : true,
                            closeOnClick: false,
                            offset: [0, -4]
                        });

                        if (m.autoOpenPopup) {
                            setTimeout(function() {
                                marker.openPopup();
                            }, 100);
                        }
                    }

                    marker.on('click', function() {
                        if (shouldShowPopup) {
                            marker.openPopup();
                        }
                        if (m.id && window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'onMarkerSelect',
                                id: m.id,
                                title: m.title
                            }));
                        }
                    });

                    activeMarkers.push(marker);
                })(markerData[i]);
            }

            if (activeMarkers.length > 1 && map) {
                try {
                    var group = new L.featureGroup(activeMarkers);
                    map.fitBounds(group.getBounds().pad(0.15));
                } catch(e) {}
            }
        }

        function updateLocation(lat, lng, zoomLevel, pinCol) {
            if (!map) return;
            if (pinCol) currentPinColor = pinCol;
            map.flyTo([lat, lng], zoomLevel || map.getZoom(), {
                animate: true,
                duration: 0.8
            });

            clearMarkers();
            var newMarker = L.marker([lat, lng], { icon: createPinIcon(currentPinColor) }).addTo(map);
            activeMarkers.push(newMarker);
        }

        document.addEventListener("DOMContentLoaded", initMap);
    </script>
</body>
</html>
        `;
    }, []);

    // Dynamically update view & markers when latitude/longitude props change without reloading WebView
    useEffect(() => {
        if (!isMapReady || !webViewRef.current) return;

        if (markers && markers.length > 0) {
            const markersJs = `if (typeof setMarkers === 'function') { setMarkers(${JSON.stringify(markers)}); } true;`;
            webViewRef.current.injectJavaScript(markersJs);
        } else if (latitude && longitude) {
            const script = `if (typeof updateLocation === 'function') { updateLocation(${latitude}, ${longitude}, ${zoom}, "${pinColor}"); } true;`;
            webViewRef.current.injectJavaScript(script);
        }
    }, [latitude, longitude, zoom, markers, pinColor, isMapReady]);

    const handleMessage = (event: WebViewMessageEvent) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "onMapReady") {
                setIsMapReady(true);
            } else if (data.type === "onLocationSelect" && onLocationSelect) {
                onLocationSelect({
                    latitude: data.latitude,
                    longitude: data.longitude,
                });
            } else if (data.type === "onMarkerSelect" && onMarkerSelect) {
                onMarkerSelect(data.id);
            }
        } catch (e) {
            console.warn("OpenStreetMap message parse error:", e);
        }
    };

    return (
        <View style={[styles.container, style]}>
            <WebView
                ref={webViewRef}
                originWhitelist={["*"]}
                source={{ html: htmlContent }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                mixedContentMode="always"
                scrollEnabled={false}
                overScrollMode="never"
                onMessage={handleMessage}
                nestedScrollEnabled={false}
            />
            {!isMapReady && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={pinColor} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "relative",
        backgroundColor: "#E2E8F0",
        overflow: "hidden",
    },
    webview: {
        flex: 1,
        backgroundColor: "transparent",
    },
    loaderContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
    },
});

export default OpenStreetMap;