/* Flashcard API client */
(function (global) {
  const STORAGE_KEY = "flashcards_settings";

  const defaultSettings = {
    baseUrl: "http://localhost:8000",
    token: "",
    userId: "",
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultSettings };
      return { ...defaultSettings, ...JSON.parse(raw) };
    } catch (e) {
      return { ...defaultSettings };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function getHeaders() {
    const s = loadSettings();
    const headers = { "Content-Type": "application/json" };
    if (s.token) headers["Authorization"] = "Bearer " + s.token;
    if (s.userId) headers["X-User-Id"] = s.userId;
    return headers;
  }

  function baseUrl() {
    return loadSettings().baseUrl.replace(/\/+$/, "");
  }

  function request(method, path, body, queryParams) {
    let url = baseUrl() + path;
    if (queryParams) {
      const qs = Object.entries(queryParams)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(
          ([k, v]) =>
            encodeURIComponent(k) + "=" + encodeURIComponent(v)
        )
        .join("&");
      if (qs) url += (url.includes("?") ? "&" : "?") + qs;
    }

    return $.ajax({
      url,
      method,
      headers: getHeaders(),
      data: body ? JSON.stringify(body) : undefined,
      dataType: "json",
    }).then(
      (data) => data,
      (jqXHR) => {
        const err = new Error(
          (jqXHR.responseJSON && jqXHR.responseJSON.detail) ||
            jqXHR.statusText ||
            "Request failed"
        );
        err.status = jqXHR.status;
        err.payload = jqXHR.responseJSON;
        throw err;
      }
    );
  }

  const API = {
    settings: { load: loadSettings, save: saveSettings },

    // Flashcards
    listFlashcards: (limit = 50, offset = 0) =>
      request("GET", "/flashcards", null, { limit, offset }),
    getFlashcard: (id) => request("GET", "/flashcards/" + id),
    createFlashcard: (data) => request("POST", "/flashcards", data),
    updateFlashcard: (id, data) =>
      request("PATCH", "/flashcards/" + id, data),
    deleteFlashcard: (id) =>
      $.ajax({
        url: baseUrl() + "/flashcards/" + id,
        method: "DELETE",
        headers: getHeaders(),
      }),

    // Groups
    listGroups: () => request("GET", "/groups"),
    getGroup: (id) => request("GET", "/groups/" + id),
    createGroup: (data) => request("POST", "/groups", data),
    updateGroup: (id, data) => request("PATCH", "/groups/" + id, data),
    deleteGroup: (id) =>
      $.ajax({
        url: baseUrl() + "/groups/" + id,
        method: "DELETE",
        headers: getHeaders(),
      }),

    // Assignments
    addFlashcardToGroup: (groupId, flashcardId) =>
      $.ajax({
        url:
          baseUrl() +
          "/groups/" +
          groupId +
          "/flashcards/" +
          flashcardId,
        method: "POST",
        headers: getHeaders(),
      }),
    removeFlashcardFromGroup: (groupId, flashcardId) =>
      $.ajax({
        url:
          baseUrl() +
          "/groups/" +
          groupId +
          "/flashcards/" +
          flashcardId,
        method: "DELETE",
        headers: getHeaders(),
      }),

    // Study
    getStudyFlashcards: (groupId, limit = 50) =>
      request("GET", "/study/flashcards", null, {
        group_id: groupId || undefined,
        limit,
      }),
    submitAnswer: (flashcardId, result) =>
      request("POST", "/study/flashcards/" + flashcardId + "/answer", {
        result,
      }),
  };

  global.FlashcardAPI = API;
})(window);
