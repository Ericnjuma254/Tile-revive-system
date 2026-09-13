const axios = require("axios");

const META_GRAPH_API_VERSION =
    process.env.META_GRAPH_API_VERSION || "v23.0";

const META_GRAPH_BASE_URL =
    `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

function getMetaConfig() {
    return {
        appId: process.env.META_APP_ID,
        appSecret: process.env.META_APP_SECRET,
        accessToken: process.env.META_ACCESS_TOKEN,
        adAccountId: process.env.META_AD_ACCOUNT_ID,
        pageId: process.env.META_PAGE_ID,
    };
}

function isMetaConfigured() {
    const config = getMetaConfig();

    return Boolean(
        config.appId &&
        config.appSecret &&
        config.accessToken &&
        config.adAccountId
    );
}

function normalizeAdAccountId(adAccountId) {
    if (!adAccountId) {
        return null;
    }

    return adAccountId.startsWith("act_")
        ? adAccountId
        : `act_${adAccountId}`;
}

async function metaRequest(path, params = {}) {
    const config = getMetaConfig();

    if (!config.accessToken) {
        throw new Error(
            "META_ACCESS_TOKEN is not configured."
        );
    }

    const response = await axios.get(
        `${META_GRAPH_BASE_URL}/${path}`,
        {
            params: {
                ...params,
                access_token: config.accessToken,
            },
            timeout: 15000,
        }
    );

    return response.data;
}

async function getAdAccount() {
    const config = getMetaConfig();

    const adAccountId =
        normalizeAdAccountId(config.adAccountId);

    if (!adAccountId) {
        throw new Error(
            "META_AD_ACCOUNT_ID is not configured."
        );
    }

    return metaRequest(adAccountId, {
        fields: [
            "id",
            "account_id",
            "name",
            "account_status",
            "currency",
            "timezone_name",
        ].join(","),
    });
}

async function getCampaigns() {
    const config = getMetaConfig();

    const adAccountId =
        normalizeAdAccountId(config.adAccountId);

    if (!adAccountId) {
        throw new Error(
            "META_AD_ACCOUNT_ID is not configured."
        );
    }

    return metaRequest(
        `${adAccountId}/campaigns`,
        {
            fields: [
                "id",
                "name",
                "status",
                "effective_status",
                "objective",
                "daily_budget",
                "lifetime_budget",
                "created_time",
                "updated_time",
            ].join(","),
            limit: 100,
        }
    );
}

async function getCampaignInsights({
    datePreset = "last_30d",
} = {}) {
    const config = getMetaConfig();

    const adAccountId =
        normalizeAdAccountId(config.adAccountId);

    if (!adAccountId) {
        throw new Error(
            "META_AD_ACCOUNT_ID is not configured."
        );
    }

    return metaRequest(
        `${adAccountId}/insights`,
        {
            level: "campaign",
            date_preset: datePreset,
            fields: [
                "campaign_id",
                "campaign_name",
                "spend",
                "impressions",
                "reach",
                "clicks",
                "ctr",
                "cpc",
                "cpm",
                "actions",
                "action_values",
            ].join(","),
            limit: 500,
        }
    );
}

module.exports = {
    getMetaConfig,
    isMetaConfigured,
    getAdAccount,
    getCampaigns,
    getCampaignInsights,
};
