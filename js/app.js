// const API = 'https://flashcards-back-production-4f5d.up.railway.app/api/v1';
const API = 'http://localhost:8080/api/v1'
let token = localStorage.getItem('token');

// --- API Client ---
function api(method, path, data) {
    return $.ajax({
        url: API + path,
        method,
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        contentType: 'application/json',
        data: data ? JSON.stringify(data) : undefined
    });
}

// --- Router ---
function showPage(page, param) {
    $('.page').hide();
    $('#page-' + page).show();
    $('#main-navbar').toggle(page !== 'auth');
    if (page === 'home') loadHome();
    if (page === 'group') loadGroup(param);
    if (page === 'study') startStudy(param);
    if (page === 'create-flashcard' && !param) resetFlashcardForm();
}

$(document).on('click', '[data-page]', function(e) {
    e.preventDefault();
    showPage($(this).data('page'));
});

// --- Auth ---
$('#auth-tabs a').on('click', function(e) {
    e.preventDefault();
    $('#auth-tabs a').removeClass('active');
    $(this).addClass('active');
    const tab = $(this).data('tab');
    $('#form-login').toggle(tab === 'login');
    $('#form-register').toggle(tab === 'register');
    $('#auth-error').hide();
});

$('#form-login').on('submit', function(e) {
    e.preventDefault();
    api('POST', '/auth/login', {
        email: $('#login-email').val(),
        password: $('#login-password').val()
    }).done(function(res) {
        token = res.token;
        localStorage.setItem('token', token);
        showPage('home');
    }).fail(function() {
        $('#auth-error').removeClass('alert-success').addClass('alert-danger').text('Email ou senha inválidos').show();
    });
});

$('#form-register').on('submit', function(e) {
    e.preventDefault();
    var $email = $('#register-email'), $pass = $('#register-password');
    var emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($email.val());
    var passValid = $pass.val().length >= 6;
    $email.toggleClass('is-invalid', !emailValid);
    $pass.toggleClass('is-invalid', !passValid);
    if (!emailValid || !passValid) return;
    api('POST', '/auth/register', {
        email: $email.val(),
        password: $pass.val()
    }).done(function() {
        $('#auth-tabs a[data-tab="login"]').click();
        $('#auth-error').removeClass('alert-danger').addClass('alert-success').text('Cadastro realizado! Faça login.').show();
    }).fail(function(xhr) {
        const msg = xhr.status === 409 ? 'Email já cadastrado' : 'Erro ao cadastrar';
        $('#auth-error').removeClass('alert-success').addClass('alert-danger').text(msg).show();
    });
});

$('#btn-logout').on('click', function(e) {
    e.preventDefault();
    token = null;
    localStorage.removeItem('token');
    showPage('auth');
});

// --- Home ---
let allFlashcards = [], allGroups = [], allSessions = [];
let showAllFc = false, showAllGroups = false;

function loadHome() {
    showAllFc = false;
    showAllGroups = false;
    clearSelection();

    api('GET', '/flashcards?limit=50').done(function(cards) {
        allFlashcards = cards.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        renderFlashcardsList();
    });
    api('GET', '/groups').done(function(groups) {
        allGroups = groups.sort(function(a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });
        renderGroupsList();
    });
    api('GET', '/sessions?limit=5').done(function(sessions) {
        allSessions = sessions;
        renderSessionsList();
    });
}

function renderFlashcardsList() {
    var $list = $('#flashcards-list').empty();
    var items = showAllFc ? allFlashcards : allFlashcards.slice(0, 5);
    $('#flashcards-empty').toggle(allFlashcards.length === 0);
    $('#btn-show-all-fc').toggle(allFlashcards.length > 5 && !showAllFc);
    items.forEach(function(c) { $list.append(renderCard(c)); });
}

function renderGroupsList() {
    var $list = $('#groups-list').empty();
    var items = showAllGroups ? allGroups : allGroups.slice(0, 5);
    $('#btn-show-all-groups').toggle(allGroups.length > 5 && !showAllGroups);
    items.forEach(function(g) {
        $list.append($(`
            <div class="col-md-4">
                <div class="home-item group-item-card">
                    <input type="checkbox" class="form-check-input item-check" data-type="group" data-id="${g.id}">
                    <span class="item-label" data-group-id="${g.id}">${escHtml(g.name)}</span>
                </div>
            </div>
        `));
    });
}

function renderSessionsList() {
    var $list = $('#sessions-list').empty();
    $('#sessions-empty').toggle(allSessions.length === 0);
    allSessions.forEach(function(s) {
        var date = new Date(s.createdAt).toLocaleDateString('pt-BR');
        $list.append($(`
            <div class="col-md-4">
                <div class="home-item session-item">
                    <input type="checkbox" class="form-check-input item-check" data-type="session" data-id="${s.id}">
                    <div>
                        <div><i class="bi bi-check text-success"></i> ${s.correctCount} <i class="bi bi-x text-danger ms-2"></i> ${s.incorrectCount}</div>
                        <small class="text-muted">${date}</small>
                    </div>
                </div>
            </div>
        `));
    });
}

$('#btn-show-all-fc').on('click', function() { showAllFc = true; renderFlashcardsList(); });
$('#btn-show-all-groups').on('click', function() { showAllGroups = true; renderGroupsList(); });

function renderCard(c) {
    const badge = c.dominanceLevel ?
        `<span class="badge badge-${c.dominanceLevel.toLowerCase()}">${c.dominanceLevel}</span>` : '';
    const groupTags = (c.groups || []).map(function(g) {
        return `<span class="badge bg-secondary fc-group-tag">${escHtml(g.name)}</span>`;
    }).join('');
    return $(`
        <div class="col-md-6">
            <div class="fc-card">
                <div class="d-flex align-items-start gap-2">
                    <input type="checkbox" class="form-check-input item-check" data-type="flashcard" data-id="${c.id}">
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <strong>${escHtml(c.textContent || '')}</strong>
                            ${badge}
                        </div>
                        ${c.imageUrl ? `<img src="${escHtml(c.imageUrl)}" class="img-fluid mt-2 rounded" style="max-height:100px">` : ''}
                        <div class="fc-answer mt-2">${escHtml(c.answer)}</div>
                        ${groupTags ? `<div class="mt-2 d-flex flex-wrap gap-1">${groupTags}</div>` : ''}
                        <div class="fc-meta d-flex gap-2 mt-2">
                            <span><i class="bi bi-check"></i> ${c.attemptsCorrect}</span>
                            <span><i class="bi bi-x"></i> ${c.attemptsIncorrect}</span>
                        </div>
                    </div>
                </div>
                <div class="mt-2 d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary btn-edit-fc" data-id="${c.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-fc" data-id="${c.id}"><i class="bi bi-trash"></i></button>
                    <button class="btn btn-sm btn-outline-secondary btn-add-group" data-id="${c.id}"><i class="bi bi-folder-plus"></i></button>
                </div>
            </div>
        </div>
    `);
}

function escHtml(s) {
    return $('<span>').text(s || '').html();
}

// --- Multi-select ---
function getSelected() {
    var sel = [];
    $('.item-check:checked').each(function() {
        sel.push({ type: $(this).data('type'), id: $(this).data('id') });
    });
    return sel;
}

function clearSelection() {
    $('.item-check').prop('checked', false);
    $('#bulk-actions').hide();
}

$(document).on('change', '.item-check', function() {
    var sel = getSelected();
    if (sel.length === 0) { $('#bulk-actions').hide(); return; }
    $('#bulk-actions').show();
    $('#bulk-count').text(sel.length + ' selecionado(s)');
    var allFlashcardsSelected = sel.every(function(s) { return s.type === 'flashcard'; });
    $('#btn-bulk-add-group').toggle(allFlashcardsSelected);
});

$('#btn-bulk-delete').on('click', function() {
    var sel = getSelected();
    if (!sel.length || !confirm('Excluir ' + sel.length + ' item(ns)?')) return;
    var promises = sel.map(function(s) {
        if (s.type === 'flashcard') return api('DELETE', '/flashcards/' + s.id);
        if (s.type === 'group') return api('DELETE', '/groups/' + s.id);
        if (s.type === 'session') return api('DELETE', '/sessions/' + s.id);
    });
    $.when.apply($, promises).always(function() { loadHome(); });
});

$('#btn-bulk-add-group').on('click', function() {
    window._bulkFcIds = getSelected().map(function(s) { return s.id; });
    openGroupModal();
});

// --- Add to Group (single card) ---
$(document).on('click', '.btn-add-group', function() {
    window._bulkFcIds = [$(this).data('id')];
    openGroupModal();
});

function openGroupModal() {
    var $checks = $('#modal-group-checks').empty();
    allGroups.forEach(function(g) {
        $checks.append(`<div class="form-check"><input class="form-check-input modal-grp-chk" type="checkbox" value="${g.id}" id="mgrp-${g.id}"><label class="form-check-label" for="mgrp-${g.id}">${escHtml(g.name)}</label></div>`);
    });
    $('#modal-new-group-name').val('');
    new bootstrap.Modal($('#modal-add-to-group')[0]).show();
}

$('#btn-modal-create-group').on('click', function() {
    var name = $('#modal-new-group-name').val().trim();
    if (!name) return;
    api('POST', '/groups', { name: name }).done(function(g) {
        allGroups.unshift(g);
        $('#modal-group-checks').append(`<div class="form-check"><input class="form-check-input modal-grp-chk" type="checkbox" value="${g.id}" id="mgrp-${g.id}" checked><label class="form-check-label" for="mgrp-${g.id}">${escHtml(g.name)}</label></div>`);
        $('#modal-new-group-name').val('');
    });
});

$('#btn-confirm-add-group').on('click', function() {
    var groupIds = [];
    $('.modal-grp-chk:checked').each(function() { groupIds.push($(this).val()); });
    if (!groupIds.length) return;
    var promises = [];
    window._bulkFcIds.forEach(function(fcId) {
        groupIds.forEach(function(gId) {
            promises.push(api('POST', '/groups/' + gId + '/flashcards/' + fcId));
        });
    });
    $.when.apply($, promises).always(function() {
        bootstrap.Modal.getInstance($('#modal-add-to-group')[0]).hide();
        clearSelection();
        loadHome();
    });
});

// --- Flashcard CRUD ---
function resetFlashcardForm() {
    $('#flashcard-form-title').text('Criar Flashcard');
    $('#flashcard-id').val('');
    $('#fc-text, #fc-image, #fc-answer').val('');
    if (allGroups.length) {
        loadFcGroupChecks([]);
    } else {
        api('GET', '/groups').done(function(groups) {
            allGroups = groups.sort(function(a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });
            loadFcGroupChecks([]);
        });
    }
}

function loadFcGroupChecks(selectedIds) {
    var $c = $('#fc-groups-checks').empty();
    allGroups.forEach(function(g) {
        var checked = selectedIds.indexOf(g.id) >= 0 ? 'checked' : '';
        $c.append(`<div class="form-check"><input class="form-check-input fc-grp-chk" type="checkbox" value="${g.id}" id="fcgrp-${g.id}" ${checked}><label class="form-check-label" for="fcgrp-${g.id}">${escHtml(g.name)}</label></div>`);
    });
}

$(document).on('click', '.btn-edit-fc', function() {
    const id = $(this).data('id');
    api('GET', '/flashcards/' + id).done(function(c) {
        $('#flashcard-form-title').text('Editar Flashcard');
        $('#flashcard-id').val(c.id);
        $('#fc-text').val(c.textContent);
        $('#fc-image').val(c.imageUrl);
        $('#fc-answer').val(c.answer);
        loadFcGroupChecks((c.groups || []).map(function(g) { return g.id; }));
        showPage('create-flashcard', true);
    });
});

$(document).on('click', '.btn-delete-fc', function() {
    if (!confirm('Excluir este flashcard?')) return;
    api('DELETE', '/flashcards/' + $(this).data('id')).done(function() { loadHome(); });
});

$('#form-flashcard').on('submit', function(e) {
    e.preventDefault();
    const id = $('#flashcard-id').val();
    const data = { textContent: $('#fc-text').val(), imageUrl: $('#fc-image').val(), answer: $('#fc-answer').val() };
    const req = id ? api('PUT', '/flashcards/' + id, data) : api('POST', '/flashcards', data);
    req.done(function(saved) {
        var groupIds = [];
        $('.fc-grp-chk:checked').each(function() { groupIds.push($(this).val()); });
        if (groupIds.length) {
            var promises = groupIds.map(function(gId) {
                return api('POST', '/groups/' + gId + '/flashcards/' + saved.id);
            });
            $.when.apply($, promises).always(function() { showPage('home'); });
        } else {
            showPage('home');
        }
    });
});

// --- Groups ---
$(document).on('click', '[data-group-id]', function() {
    showPage('group', $(this).data('group-id'));
});

$('#btn-create-group').on('click', function() {
    $('#group-name').val('');
    new bootstrap.Modal($('#modal-group')[0]).show();
});

$('#form-group').on('submit', function(e) {
    e.preventDefault();
    api('POST', '/groups', { name: $('#group-name').val() }).done(function() {
        bootstrap.Modal.getInstance($('#modal-group')[0]).hide();
        loadHome();
    });
});

let currentGroupId = null;
function loadGroup(id) {
    currentGroupId = id;
    api('GET', '/groups/' + id).done(function(g) {
        $('#group-title').text(g.name);
        const $list = $('#group-flashcards').empty();
        $('#group-empty').toggle(g.flashcards.length === 0);
        g.flashcards.forEach(function(c) { $list.append(renderCard(c)); });
    });
}

$('#btn-delete-group').on('click', function() {
    if (!confirm('Excluir este grupo?')) return;
    api('DELETE', '/groups/' + currentGroupId).done(function() { showPage('home'); });
});

$('#btn-study-group').on('click', function(e) {
    e.preventDefault();
    showPage('study', currentGroupId);
});

// --- Study ---
let studyCards = [], studyIndex = 0, studyCorrect = 0, studyIncorrect = 0;

function startStudy(groupId) {
    if (groupId === true) return;
    $('#study-card, #study-hint, #study-done, #study-empty').hide();
    $('#study-actions').addClass('d-none');
    $('#study-progress').text('');
    studyCorrect = 0;
    studyIncorrect = 0;
    const params = groupId ? '?group_id=' + groupId + '&limit=20' : '?limit=20';
    api('GET', '/study/flashcards' + params).done(function(cards) {
        studyCards = cards;
        studyIndex = 0;
        if (cards.length === 0) {
            $('#study-empty').show();
        } else {
            showStudyCard();
        }
    });
}

function showStudyCard() {
    const c = studyCards[studyIndex];
    $('#study-front-text').text(c.textContent || '');
    if (c.imageUrl) { $('#study-front-img').attr('src', c.imageUrl).show(); }
    else { $('#study-front-img').hide(); }
    $('#study-back-text').text(c.answer);
    $('#study-card-inner').removeClass('flipped');
    $('#study-card, #study-hint').show();
    $('#study-actions').addClass('d-none');
    $('#study-progress').text((studyIndex + 1) + ' / ' + studyCards.length);
}

$('#study-card').on('click', function() {
    $('#study-card-inner').addClass('flipped');
    $('#study-actions').removeClass('d-none');
    $('#study-hint').hide();
});

$('#btn-correct, #btn-incorrect').on('click', function() {
    const result = $(this).attr('id') === 'btn-correct' ? 'correct' : 'incorrect';
    if (result === 'correct') studyCorrect++; else studyIncorrect++;
    api('POST', '/study/flashcards/' + studyCards[studyIndex].id + '/answer', { result });
    studyIndex++;
    if (studyIndex >= studyCards.length) {
        $('#study-card, #study-hint').hide();
        $('#study-actions').addClass('d-none');
        $('#study-done').show();
        api('POST', '/sessions', { correctCount: studyCorrect, incorrectCount: studyIncorrect });
    } else {
        showStudyCard();
    }
});

// --- Init ---
$(function() {
    if (token) showPage('home');
    else showPage('auth');
});
