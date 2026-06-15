const API = 'https://flashcards-back-production-4f5d.up.railway.app/api/v1';
// const API = 'http:localhost:8080/api/v1'
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
        $('#auth-error').text('Email ou senha inválidos').show();
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
    }).done(function(res) {
        token = res.token;
        localStorage.setItem('token', token);
        showPage('home');
    }).fail(function(xhr) {
        const msg = xhr.status === 409 ? 'Email já cadastrado' : 'Erro ao cadastrar';
        $('#auth-error').text(msg).show();
    });
});

$('#btn-logout').on('click', function(e) {
    e.preventDefault();
    token = null;
    localStorage.removeItem('token');
    showPage('auth');
});

// --- Home ---
function loadHome() {
    api('GET', '/flashcards?limit=50').done(function(cards) {
        const $list = $('#flashcards-list').empty();
        $('#flashcards-empty').toggle(cards.length === 0);
        cards.forEach(function(c) {
            $list.append(renderCard(c));
        });
    });
    api('GET', '/groups').done(function(groups) {
        const $list = $('#groups-list').empty();
        groups.forEach(function(g) {
            $list.append(
                $('<div class="group-item">').append(
                    $('<span>').text(g.name),
                    $('<i class="bi bi-chevron-right text-muted">')
                ).on('click', function() { showPage('group', g.id); })
            );
        });
    });
}

function renderCard(c) {
    const badge = c.dominanceLevel ?
        `<span class="badge badge-${c.dominanceLevel.toLowerCase()}">${c.dominanceLevel}</span>` : '';
    return $(`
        <div class="col-md-6">
            <div class="fc-card">
                <div class="d-flex justify-content-between align-items-start">
                    <strong>${escHtml(c.textContent || '')}</strong>
                    ${badge}
                </div>
                ${c.imageUrl ? `<img src="${escHtml(c.imageUrl)}" class="img-fluid mt-2 rounded" style="max-height:100px">` : ''}
                <div class="fc-answer mt-2">${escHtml(c.answer)}</div>
                <div class="fc-meta d-flex gap-2 mt-2">
                    <span><i class="bi bi-check"></i> ${c.attemptsCorrect}</span>
                    <span><i class="bi bi-x"></i> ${c.attemptsIncorrect}</span>
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

// --- Flashcard CRUD ---
function resetFlashcardForm() {
    $('#flashcard-form-title').text('Criar Flashcard');
    $('#flashcard-id').val('');
    $('#fc-text, #fc-image, #fc-answer').val('');
}

$(document).on('click', '.btn-edit-fc', function() {
    const id = $(this).data('id');
    api('GET', '/flashcards/' + id).done(function(c) {
        $('#flashcard-form-title').text('Editar Flashcard');
        $('#flashcard-id').val(c.id);
        $('#fc-text').val(c.textContent);
        $('#fc-image').val(c.imageUrl);
        $('#fc-answer').val(c.answer);
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
    req.done(function() { showPage('home'); });
});

// --- Add to Group ---
$(document).on('click', '.btn-add-group', function() {
    const fcId = $(this).data('id');
    api('GET', '/groups').done(function(groups) {
        const $list = $('#modal-groups-list').empty();
        groups.forEach(function(g) {
            $list.append(
                $('<div class="group-select-item">').text(g.name).on('click', function() {
                    api('POST', '/groups/' + g.id + '/flashcards/' + fcId).always(function() {
                        bootstrap.Modal.getInstance($('#modal-add-to-group')[0]).hide();
                    });
                })
            );
        });
        new bootstrap.Modal($('#modal-add-to-group')[0]).show();
    });
});

// --- Groups ---
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
    startStudy(currentGroupId);
});

// --- Study ---
let studyCards = [], studyIndex = 0;

function startStudy(groupId) {
    const params = groupId ? '?group_id=' + groupId + '&limit=20' : '?limit=20';
    api('GET', '/study/flashcards' + params).done(function(cards) {
        studyCards = cards;
        studyIndex = 0;
        if (cards.length === 0) {
            $('#study-card, #study-actions, #study-hint').hide();
            $('#study-done').show();
            $('#study-progress').text('');
        } else {
            $('#study-done').hide();
            showStudyCard();
        }
        showPage('study', true);
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
    $('#study-actions').hide();
    $('#study-progress').text((studyIndex + 1) + ' / ' + studyCards.length);
}

$('#study-card').on('click', function() {
    $('#study-card-inner').addClass('flipped');
    $('#study-actions').show();
    $('#study-hint').hide();
});

$('#btn-correct, #btn-incorrect').on('click', function() {
    const result = $(this).attr('id') === 'btn-correct' ? 'correct' : 'incorrect';
    api('POST', '/study/flashcards/' + studyCards[studyIndex].id + '/answer', { result });
    studyIndex++;
    if (studyIndex >= studyCards.length) {
        $('#study-card, #study-actions, #study-hint').hide();
        $('#study-done').show();
    } else {
        showStudyCard();
    }
});

// --- Init ---
$(function() {
    if (token) showPage('home');
    else showPage('auth');
});
