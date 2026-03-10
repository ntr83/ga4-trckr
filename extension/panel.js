const out = document.getElementById("out");
const clearLog = document.getElementById("clearLog");
const summary = document.getElementById("summary");

const providerStats = new Map();

const providers = [
    {
        id: "ga4",
        label: "GA4",
        className: "provider-ga4",
        pillClass: "provider-pill-ga4",
        colorVar: "--ga",
        match: (url) => url.pathname.includes("/g/collect") || url.pathname.includes("/mp/collect"),
        parse: (url, params, json) => ({
            eventName: params.get("en") || params.get("event") || json?.events?.[0]?.name || null,
            measurementId: params.get("tid") || null,
            clientId: params.get("cid") || null,
            sessionId: params.get("sid") || null
        })
    },
    {
        id: "facebook",
        label: "Facebook Pixel",
        className: "provider-facebook",
        pillClass: "provider-pill-facebook",
        colorVar: "--fb",
        match: (url) => url.hostname.includes("facebook.com") && url.pathname.includes("/tr"),
        parse: (url, params) => ({
            eventName: params.get("ev") || params.get("event") || null,
            measurementId: params.get("id") || null
        })
    },
    {
        id: "tiktok",
        label: "TikTok Pixel",
        className: "provider-tiktok",
        pillClass: "provider-pill-tiktok",
        colorVar: "--tt",
        match: (url) => url.hostname.includes("tiktok.com") && url.pathname.includes("/pixel"),
        parse: (url, params) => ({
            eventName: params.get("event") || params.get("ev") || null,
            measurementId: params.get("pixel_id") || params.get("id") || null
        })
    },
    {
        id: "linkedin",
        label: "LinkedIn Insight",
        className: "provider-linkedin",
        pillClass: "provider-pill-linkedin",
        colorVar: "--li",
        match: (url) => url.hostname.includes("ads.linkedin.com") || url.hostname.includes("px.ads.linkedin.com"),
        parse: (url, params) => ({
            eventName: params.get("event") || params.get("conversionId") || null,
            measurementId: params.get("pid") || params.get("conversionId") || null
        })
    },
    {
        id: "pinterest",
        label: "Pinterest Tag",
        className: "provider-pinterest",
        pillClass: "provider-pill-pinterest",
        colorVar: "--pin",
        match: (url) => url.hostname.includes("pinterest.com") && url.hostname.includes("ct."),
        parse: (url, params) => ({
            eventName: params.get("event") || params.get("ev") || null,
            measurementId: params.get("tid") || params.get("id") || null
        })
    },
    {
        id: "x",
        label: "X (Twitter)",
        className: "provider-x",
        pillClass: "provider-pill-x",
        colorVar: "--x",
        match: (url) => url.hostname.includes("twitter.com") && url.pathname.includes("/i/adsct"),
        parse: (url, params) => ({
            eventName: params.get("event") || params.get("ev") || null,
            measurementId: params.get("p_id") || params.get("id") || null
        })
    },
    {
        id: "microsoft",
        label: "Microsoft UET",
        className: "provider-microsoft",
        pillClass: "provider-pill-microsoft",
        colorVar: "--ms",
        match: (url) => url.hostname.includes("bing.com") && url.pathname.includes("/action"),
        parse: (url, params) => ({
            eventName: params.get("event") || params.get("ev") || null,
            measurementId: params.get("ti") || params.get("tagid") || null
        })
    },
    {
        id: "google-ads",
        label: "Google Ads",
        className: "provider-ga4",
        pillClass: "provider-pill-ga4",
        colorVar: "--ga",
        match: (url) => url.hostname.includes("doubleclick.net") || url.hostname.includes("googleads.g.doubleclick.net"),
        parse: (url, params) => ({
            eventName: params.get("conversion_label") || params.get("label") || params.get("event") || null,
            measurementId: params.get("conversion_id") || params.get("id") || null
        })
    }
];

clearLog.addEventListener("click", () => {
    clear();
});

function clear() {
    out.innerHTML = "";
    summary.innerHTML = "";
    providerStats.clear();
}

function parsePostData(text) {
    if (!text) return { params: null, json: null };

    if (text.trim().startsWith("{")) {
        try {
            return { params: null, json: JSON.parse(text) };
        } catch {
            return { params: null, json: null };
        }
    }

    if (!text.includes("=")) return { params: null, json: null };

    return { params: new URLSearchParams(text), json: null };
}

function mergeParams(urlParams, postParams) {
    const merged = new URLSearchParams(urlParams);
    if (postParams) {
        for (const [key, value] of postParams.entries()) {
            merged.append(key, value);
        }
    }
    return merged;
}

function formatTime(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString([], { hour12: false });
}

function updateSummary(providerId, label, measurementId) {
    const existing = providerStats.get(providerId) || {
        label,
        ids: new Set(),
        count: 0
    };

    if (measurementId) existing.ids.add(measurementId);
    existing.count += 1;
    providerStats.set(providerId, existing);

    renderSummary();
}

function renderSummary() {
    summary.innerHTML = "";
    for (const [providerId, info] of providerStats.entries()) {
        const chip = document.createElement("div");
        chip.className = "chip";

        const dot = document.createElement("span");
        dot.className = "dot";
        const provider = providers.find((p) => p.id === providerId);
        if (provider && provider.colorVar) {
            dot.style.background = getComputedStyle(document.documentElement).getPropertyValue(
                provider.colorVar
            ) || "var(--other)";
        } else {
            dot.style.background = "var(--other)";
        }
        chip.appendChild(dot);

        const text = document.createElement("span");
        const ids = Array.from(info.ids);
        const idText = ids.length ? ` • ${ids.length} id: ${ids.join(", ")}` : "";
        text.textContent = `${info.label}: ${info.count} event${info.count === 1 ? "" : "s"}${idText}`;
        chip.appendChild(text);
        summary.appendChild(chip);
    }
}

function logEvent(event) {
    const details = document.createElement("details");
    details.className = `log ${event.providerClass}`;

    const summaryEl = document.createElement("summary");
    const timeEl = document.createElement("span");
    timeEl.className = "time";
    timeEl.textContent = formatTime(event.timestamp);

    const eventEl = document.createElement("span");
    eventEl.className = "event";
    eventEl.textContent = event.eventName || "(no event name)";

    const providerEl = document.createElement("span");
    providerEl.className = `provider ${event.providerPillClass}`;
    providerEl.textContent = event.providerLabel;

    summaryEl.appendChild(timeEl);
    summaryEl.appendChild(eventEl);
    summaryEl.appendChild(providerEl);

    const body = document.createElement("div");
    body.className = "log-body";
    body.textContent = JSON.stringify(event.details, null, 2);

    details.appendChild(summaryEl);
    details.appendChild(body);
    out.appendChild(details);
}

chrome.devtools.network.onRequestFinished.addListener((req) => {
    try {
        const urlText = req.request.url;
        const u = new URL(urlText);
        const provider = providers.find((p) => p.match(u));

        if (!provider) return;

    const postDataText = req.request.postData?.text || null;
    const postData = parsePostData(postDataText);
    const params = mergeParams(u.searchParams, postData.params);
    const parsed = provider.parse(u, params, postData.json);

        const event = {
            timestamp: req.startedDateTime || new Date().toISOString(),
            providerId: provider.id,
            providerLabel: provider.label,
            providerClass: provider.className || "provider-other",
            providerPillClass: provider.pillClass || "provider-pill-other",
            eventName: parsed.eventName,
            measurementId: parsed.measurementId,
            details: {
                timestamp: req.startedDateTime || new Date().toISOString(),
                url: urlText,
                eventName: parsed.eventName,
                measurementId: parsed.measurementId,
                clientId: parsed.clientId || null,
                sessionId: parsed.sessionId || null,
                raw_get_params: Object.fromEntries(u.searchParams.entries()),
                raw_post_data: postDataText,
                raw_post_json: postData.json || null
            }
        };

        logEvent(event);
        updateSummary(provider.id, provider.label, parsed.measurementId);
    } catch (e) {
        logEvent({
            timestamp: new Date().toISOString(),
            providerId: "other",
            providerLabel: "Other",
            providerClass: "provider-other",
            providerPillClass: "provider-pill-other",
            eventName: "error",
            measurementId: null,
            details: { error: e.toString() }
        });
    }
});
