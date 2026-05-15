/* Flashcard front-end controller */
$(function () {
  const api = window.FlashcardAPI;

  // UI state
  const state = {
    flashcards: [],
    groups: [],
    flashcardPage: 0,
    flashcardPageSize: 12,
    study: {
      cards: [],
      index: 0,
    },
  };

  // --- Toast helper ---
  function toast(message, variant) {
    const el = $("#appToast");
    el.removeClass(
      "text-bg-dark text-bg-danger text-bg-success text-bg-warning"
    );
    el.addClass("text-bg-" + (variant || "dark"));
    $("#appToastBody").text(message);
    const t = bootstrap.Toast.getOrCreateInstance(el[0], { delay: 3500 });
    t.show();
  }

  function handleError(err) {
    const msg =
      (err && err.message) ||
      "Something went wrong talking to the API.";
    toast(msg, "danger");
    console.error(err);
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function dominanceBadge(level) {
    const lvl = level || "low";
    return (
      '<span class="badge dominance-' +
      lvl +
      '">' +
      lvl +
      "</span>"
    );
  }

  // --- Settings ---
  function initSettings() {
    const s = api.settings.load();
    $("#apiBaseUrl").val(s.baseUrl);
    $("#authToken").val(s.token);
    $("#userId").val(s.userId);
  }

  $("#settingsForm").on("submit", function (e) {
    e.preventDefault();
    api.settings.save({
      baseUrl: $("#apiBaseUrl").val().trim(),
      token: $("#authToken").val().trim(),
      userId: $("#userId").val().trim(),
    });
    bootstrap.Modal.getInstance($("#settingsModal")[0]).hide();
    toast("Settings saved", "success");
    refreshAll();
  });

  // --- Flashcards ---
  function renderFlashcards() {
    const list = $("#flashcardsList").empty();
    const start = state.flashcardPage * state.flashcardPageSize;
    const pageItems = state.flashcards.slice(
      start,
      start + state.flashcardPageSize
    );

    if (pageItems.length === 0) {
      list.html(
        '<div class="col-12"><div class="alert alert-info mb-0">No flashcards yet. Click <strong>New Flashcard</strong> to create one.</div></div>'
      );
    } else {
      pageItems.forEach((fc) => {
        const imageHtml = fc.image_url
          ? '<img src="' +
            escapeHtml(fc.image_url) +
            '" alt="flashcard image" class="mb-2" />'
          : "";
        const textHtml = fc.text_content
          ? '<p class="card-text">' +
            escapeHtml(fc.text_content) +
            "</p>"
          : "";

        const card = $(
          '<div class="col-md-4 col-sm-6">' +
            '<div class="card flashcard-card shadow-sm">' +
            '<div class="card-body d-flex flex-column">' +
            '<div class="d-flex justify-content-between align-items-start mb-2">' +
            dominanceBadge(fc.dominance_level) +
            '<div class="btn-group btn-group-sm">' +
            '<button class="btn btn-outline-secondary btn-edit" title="Edit"><i class="bi bi-pencil"></i></button>' +
            '<button class="btn btn-outline-danger btn-delete" title="Delete"><i class="bi bi-trash"></i></button>' +
            "</div>" +
            "</div>" +
            imageHtml +
            textHtml +
            '<div class="mt-auto pt-2 small text-muted">' +
            '<div><strong>Answer:</strong> ' +
            escapeHtml(fc.answer) +
            "</div>" +
            "<div>" +
            '<i class="bi bi-check-circle text-success"></i> ' +
            (fc.attempts_correct || 0) +
            " &middot; " +
            '<i class="bi bi-x-circle text-danger"></i> ' +
            (fc.attempts_incorrect || 0) +
            "</div>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "</div>"
        );

        card.find(".btn-edit").on("click", () => openFlashcardModal(fc));
        card.find(".btn-delete").on("click", () => deleteFlashcard(fc));
        list.append(card);
      });
    }

    renderFlashcardsPagination();
  }

  function renderFlashcardsPagination() {
    const totalPages = Math.max(
      1,
      Math.ceil(state.flashcards.length / state.flashcardPageSize)
    );
    const ul = $("#flashcardsPagination").empty();
    if (totalPages <= 1) return;

    for (let i = 0; i < totalPages; i++) {
      const li = $(
        '<li class="page-item"><a href="#" class="page-link">' +
          (i + 1) +
          "</a></li>"
      );
      if (i === state.flashcardPage) li.addClass("active");
      li.on("click", function (e) {
        e.preventDefault();
        state.flashcardPage = i;
        renderFlashcards();
      });
      ul.append(li);
    }
  }

  function loadFlashcards() {
    return api
      .listFlashcards(200, 0)
      .then((items) => {
        state.flashcards = items || [];
        renderFlashcards();
      })
      .catch(handleError);
  }

  function openFlashcardModal(flashcard) {
    $("#flashcardId").val(flashcard ? flashcard.id : "");
    $("#flashcardText").val(flashcard ? flashcard.text_content || "" : "");
    $("#flashcardImage").val(flashcard ? flashcard.image_url || "" : "");
    $("#flashcardAnswer").val(flashcard ? flashcard.answer || "" : "");
    $("#flashcardModalTitle").text(
      flashcard ? "Edit Flashcard" : "New Flashcard"
    );

    const checklist = $("#flashcardGroupsChecklist").empty();
    if (!flashcard) {
      checklist.html(
        '<div class="text-muted small">Save the flashcard first, then add it to groups.</div>'
      );
    } else if (state.groups.length === 0) {
      checklist.html(
        '<div class="text-muted small">No groups available.</div>'
      );
    } else {
      // Load current memberships
      api
        .getFlashcard(flashcard.id)
        .then(() => api.listGroups())
        .then(() => {
          // Build checklist, marking groups that include this flashcard
          state.groups.forEach((g) => {
            const checked =
              flashcard.groups &&
              flashcard.groups.some((fg) => fg.id === g.id);
            const row = $(
              '<div class="form-check">' +
                '<input class="form-check-input" type="checkbox" id="grp_' +
                g.id +
                '" value="' +
                g.id +
                '" ' +
                (checked ? "checked" : "") +
                " />" +
                '<label class="form-check-label" for="grp_' +
                g.id +
                '">' +
                escapeHtml(g.name) +
                "</label>" +
                "</div>"
            );
            checklist.append(row);
          });
        })
        .catch(handleError);
    }

    const modal = bootstrap.Modal.getOrCreateInstance(
      $("#flashcardModal")[0]
    );
    modal.show();
  }

  $("#btnNewFlashcard").on("click", () => openFlashcardModal(null));

  $("#flashcardForm").on("submit", function (e) {
    e.preventDefault();
    const id = $("#flashcardId").val();
    const text = $("#flashcardText").val().trim();
    const image = $("#flashcardImage").val().trim();
    const answer = $("#flashcardAnswer").val().trim();

    if (!answer) {
      toast("Answer is required", "warning");
      return;
    }
    if (!text && !image) {
      toast("Provide text content or an image URL", "warning");
      return;
    }

    const payload = {
      text_content: text || null,
      image_url: image || null,
      answer,
    };

    const op = id
      ? api.updateFlashcard(id, payload)
      : api.createFlashcard(payload);

    op.then((saved) => {
      // Sync group memberships (only when editing)
      if (id) {
        const desired = $("#flashcardGroupsChecklist input:checked")
          .map(function () {
            return $(this).val();
          })
          .get();
        const current = $("#flashcardGroupsChecklist input")
          .map(function () {
            return { id: $(this).val(), checked: this.checked };
          })
          .get();

        const tasks = [];
        current.forEach((item) => {
          const original = state.flashcards.find((f) => f.id === id);
          const wasIn =
            original &&
            original.groups &&
            original.groups.some((g) => g.id === item.id);
          if (item.checked && !wasIn) {
            tasks.push(api.addFlashcardToGroup(item.id, id));
          } else if (!item.checked && wasIn) {
            tasks.push(api.removeFlashcardFromGroup(item.id, id));
          }
        });

        return Promise.all(tasks).then(() => saved);
      }
      return saved;
    })
      .then(() => {
        bootstrap.Modal.getInstance($("#flashcardModal")[0]).hide();
        toast("Flashcard saved", "success");
        return loadFlashcards();
      })
      .catch(handleError);
  });

  function deleteFlashcard(fc) {
    if (!confirm("Delete this flashcard?")) return;
    api
      .deleteFlashcard(fc.id)
      .then(() => {
        toast("Flashcard deleted", "success");
        return loadFlashcards();
      })
      .catch(handleError);
  }

  // --- Groups ---
  function renderGroups() {
    const list = $("#groupsList").empty();
    if (state.groups.length === 0) {
      list.html(
        '<div class="col-12"><div class="alert alert-info mb-0">No groups yet.</div></div>'
      );
    } else {
      state.groups.forEach((g) => {
        const card = $(
          '<div class="col-md-4 col-sm-6">' +
            '<div class="card group-card shadow-sm">' +
            '<div class="card-body">' +
            '<div class="d-flex justify-content-between align-items-start">' +
            '<h5 class="card-title mb-0">' +
            escapeHtml(g.name) +
            "</h5>" +
            '<div class="btn-group btn-group-sm">' +
            '<button class="btn btn-outline-secondary btn-edit" title="Rename"><i class="bi bi-pencil"></i></button>' +
            '<button class="btn btn-outline-danger btn-delete" title="Delete"><i class="bi bi-trash"></i></button>' +
            "</div>" +
            "</div>" +
            '<p class="text-muted small mt-2 mb-0">Click to view flashcards</p>' +
            "</div>" +
            "</div>" +
            "</div>"
        );

        card
          .find(".card-body")
          .on("click", function (e) {
            if ($(e.target).closest(".btn-group").length) return;
            openGroupDetail(g);
          });
        card.find(".btn-edit").on("click", (e) => {
          e.stopPropagation();
          openGroupModal(g);
        });
        card.find(".btn-delete").on("click", (e) => {
          e.stopPropagation();
          deleteGroup(g);
        });
        list.append(card);
      });
    }

    // Sync study group select
    const sel = $("#studyGroupSelect");
    const currentVal = sel.val();
    sel.empty().append('<option value="">All flashcards</option>');
    state.groups.forEach((g) => {
      sel.append(
        '<option value="' +
          g.id +
          '">' +
          escapeHtml(g.name) +
          "</option>"
      );
    });
    sel.val(currentVal || "");
  }

  function loadGroups() {
    return api
      .listGroups()
      .then((items) => {
        state.groups = items || [];
        renderGroups();
      })
      .catch(handleError);
  }

  function openGroupModal(group) {
    $("#groupId").val(group ? group.id : "");
    $("#groupName").val(group ? group.name : "");
    $("#groupModalTitle").text(group ? "Rename Group" : "New Group");
    bootstrap.Modal.getOrCreateInstance($("#groupModal")[0]).show();
  }

  $("#btnNewGroup").on("click", () => openGroupModal(null));

  $("#groupForm").on("submit", function (e) {
    e.preventDefault();
    const id = $("#groupId").val();
    const name = $("#groupName").val().trim();
    if (!name) {
      toast("Name is required", "warning");
      return;
    }
    const op = id
      ? api.updateGroup(id, { name })
      : api.createGroup({ name });
    op.then(() => {
      bootstrap.Modal.getInstance($("#groupModal")[0]).hide();
      toast("Group saved", "success");
      return loadGroups();
    }).catch(handleError);
  });

  function deleteGroup(g) {
    if (!confirm("Delete this group? Flashcards are not deleted.")) return;
    api
      .deleteGroup(g.id)
      .then(() => {
        toast("Group deleted", "success");
        return loadGroups();
      })
      .catch(handleError);
  }

  function openGroupDetail(group) {
    $("#groupDetailTitle").text(group.name);
    const body = $("#groupDetailBody").html(
      '<div class="text-muted">Loading...</div>'
    );
    api
      .getGroup(group.id)
      .then((detail) => {
        body.empty();
        const cards = detail.flashcards || [];
        if (cards.length === 0) {
          body.html('<div class="alert alert-info mb-0">No flashcards in this group.</div>');
          return;
        }
        const row = $('<div class="row g-3"></div>');
        cards.forEach((fc) => {
          const item = $(
            '<div class="col-md-6">' +
              '<div class="card">' +
              '<div class="card-body">' +
              '<div class="d-flex justify-content-between">' +
              "<div>" +
              (fc.text_content
                ? "<div>" + escapeHtml(fc.text_content) + "</div>"
                : "") +
              '<div class="small text-muted">Answer: ' +
              escapeHtml(fc.answer) +
              "</div>" +
              "</div>" +
              dominanceBadge(fc.dominance_level) +
              "</div>" +
              '<button class="btn btn-sm btn-outline-danger mt-2 btn-remove">' +
              '<i class="bi bi-dash-circle"></i> Remove from group' +
              "</button>" +
              "</div>" +
              "</div>" +
              "</div>"
          );
          item.find(".btn-remove").on("click", () => {
            api
              .removeFlashcardFromGroup(group.id, fc.id)
              .then(() => {
                toast("Removed from group", "success");
                openGroupDetail(group);
                loadFlashcards();
              })
              .catch(handleError);
          });
          row.append(item);
        });
        body.append(row);
      })
      .catch(handleError);

    bootstrap.Modal.getOrCreateInstance($("#groupDetailModal")[0]).show();
  }

  // --- Study ---
  $("#btnStartStudy").on("click", function () {
    const groupId = $("#studyGroupSelect").val();
    const limit = parseInt($("#studyLimit").val(), 10) || 50;
    api
      .getStudyFlashcards(groupId, Math.min(Math.max(limit, 1), 200))
      .then((items) => {
        state.study.cards = items || [];
        state.study.index = 0;
        if (state.study.cards.length === 0) {
          $("#studyArea").addClass("d-none");
          $("#studyEmpty").removeClass("d-none");
        } else {
          $("#studyEmpty").addClass("d-none");
          $("#studyArea").removeClass("d-none");
          showStudyCard();
        }
      })
      .catch(handleError);
  });

  function showStudyCard() {
    const card = state.study.cards[state.study.index];
    if (!card) {
      $("#studyArea").addClass("d-none");
      $("#studyEmpty")
        .removeClass("d-none")
        .text("Session complete. Nice work.");
      return;
    }
    $("#studyIndex").text(state.study.index + 1);
    $("#studyTotal").text(state.study.cards.length);
    $("#studyDominance")
      .removeClass("dominance-low dominance-medium dominance-high")
      .addClass("dominance-" + (card.dominance_level || "low"))
      .text(card.dominance_level || "low");
    $("#studyFront").text(card.text_content || "");
    if (card.image_url) {
      $("#studyImage").attr("src", card.image_url).removeClass("d-none");
    } else {
      $("#studyImage").addClass("d-none").removeAttr("src");
    }
    $("#studyAnswerText").text(card.answer || "");
    $("#studyAnswer").addClass("d-none");
    $("#studyActions").addClass("d-none");
    $("#btnRevealAnswer").removeClass("d-none");
  }

  $("#btnRevealAnswer").on("click", function () {
    $("#studyAnswer").removeClass("d-none");
    $("#studyActions").removeClass("d-none");
    $(this).addClass("d-none");
  });

  function submitStudyAnswer(result) {
    const card = state.study.cards[state.study.index];
    if (!card) return;
    api
      .submitAnswer(card.id, result)
      .then((updated) => {
        // reflect updated state in local copy
        const idx = state.flashcards.findIndex((f) => f.id === updated.id);
        if (idx >= 0) state.flashcards[idx] = updated;
        state.study.index += 1;
        showStudyCard();
      })
      .catch(handleError);
  }

  $("#btnCorrect").on("click", () => submitStudyAnswer("correct"));
  $("#btnIncorrect").on("click", () => submitStudyAnswer("incorrect"));

  // --- Bootstrap everything ---
  function refreshAll() {
    return Promise.all([loadFlashcards(), loadGroups()]);
  }

  initSettings();
  refreshAll();
});
