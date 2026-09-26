// Access records contain hashes only. Member identity always comes from MEMBRES.
function accessHash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8)
    .map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

let ucAccessLockHeld_ = false;
function accessLocked_(action) {
  if (ucAccessLockHeld_) return action();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  ucAccessLockHeld_ = true;
  try { return action(); } finally { ucAccessLockHeld_ = false; lock.releaseLock(); }
}

function memberKey_(member) { return clean_(member.ID_Membre) || personKey_(member.Nom, member.Prenom, member.Email); }
function memberAccessKey_(key) { return 'uc.member.' + accessHash_(key); }
function memberCredentialKindKey_(key) { return 'uc.member.kind.' + accessHash_(key); }
function passwordHash_(value) { return accessHash_('PWD:' + String(value)); }
function memberCredentialKind_(member) {
  const props = PropertiesService.getScriptProperties();
  const kinds = memberAliases_(member).map(function(key) { return props.getProperty(memberCredentialKindKey_(key)); }).filter(Boolean);
  return kinds.indexOf('password') >= 0 ? 'password' : memberCodeHash_(member) ? 'temporary' : '';
}
function credentialCandidates_(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw || raw.length > 80) return [];
  const candidates = [passwordHash_(raw)];
  const legacy = raw.toUpperCase().replace(/[\s-]/g, '');
  if (/^[A-F0-9]{16}$/.test(legacy)) candidates.push(accessHash_(legacy));
  return Array.from(new Set(candidates));
}
function validateMemberPassword_(value) {
  const password = String(value == null ? '' : value);
  if (password.length < 8 || password.length > 80) throw new Error('Le mot de passe doit contenir entre 8 et 80 caractères.');
  if (/^\s|\s$/.test(password)) throw new Error('Le mot de passe ne doit pas commencer ou finir par un espace.');
  return password;
}
function memberProfile_(member) {
  return {nom: clean_(member.Nom), prenom: clean_(member.Prenom), statut: clean_(member.Statut),
    cayenne: clean_(member.Cayenne), email: clean_(member.Email), telephone: clean_(member.Telephone)};
}

function memberByKey_(key) {
  ensureAuditSchema_();
  const matches = getRowsAsObjects_(UC_APP.sheets.membres).filter(function(member) {
    return member.Nom && member.Prenom && memberAliases_(member).includes(key);
  });
  if (matches.length !== 1 || !isActive_(matches[0].Actif)) throw new Error('SESSION_EXPIRED: Accès indisponible. Contactez le bureau.');
  return matches[0];
}

// Remembered member sessions survive cache eviction; the personal code is never stored on the device.
function pruneRememberedSessions_(memberKey, revokeAll) {
  const props = PropertiesService.getScriptProperties();
  const values = props.getProperties(), remaining = [];
  Object.keys(values).filter(function(key) { return key.indexOf('uc.remembered.') === 0; }).forEach(function(key) {
    const session = JSON.parse(values[key]);
    if (session.expires <= Date.now() || (revokeAll && session.key === memberKey)) props.deleteProperty(key);
    else if (session.key === memberKey) remaining.push({key: key, expires: session.expires});
  });
  // Keep at most five remembered devices per member, including the one being added.
  remaining.sort(function(a, b) { return b.expires - a.expires; }).slice(4).forEach(function(session) { props.deleteProperty(session.key); });
}

function createAccessSession_(data, remember) {
  const token = Utilities.getUuid() + Utilities.getUuid();
  if (data.role === 'member' && remember === true) {
    pruneRememberedSessions_(data.key, false);
    data.expires = Date.now() + 90 * 24 * 60 * 60 * 1000;
    PropertiesService.getScriptProperties().setProperty('uc.remembered.' + accessHash_(token), JSON.stringify(data));
    return token;
  }
  data.expires = Date.now() + 4 * 60 * 60 * 1000;
  CacheService.getScriptCache().put('uc.session.' + accessHash_(token), JSON.stringify(data), 14400);
  return token;
}

function accessSession_(token, role) {
  if (typeof token !== 'string' || !token || token.length >= 200) throw new Error('SESSION_EXPIRED: Reconnectez-vous à votre espace.');
  const digest = accessHash_(token);
  const raw = CacheService.getScriptCache().get('uc.session.' + digest) ||
    (role === 'member' && PropertiesService.getScriptProperties().getProperty('uc.remembered.' + digest));
  const session = raw ? JSON.parse(raw) : null;
  if (!session || session.role !== role || session.expires <= Date.now()) throw new Error('SESSION_EXPIRED: Reconnectez-vous à votre espace.');
  return session;
}

function logoutAccess(token) {
  if (typeof token === 'string' && token.length < 200) {
    CacheService.getScriptCache().remove('uc.session.' + accessHash_(token));
    PropertiesService.getScriptProperties().deleteProperty('uc.remembered.' + accessHash_(token));
  }
  return {ok: true};
}

// Apps Script does not expose a reliable visitor IP. A bounded shared window limits guesses.
function checkLogin_(role, verify) {
  return accessLocked_(function() {
    const props = PropertiesService.getScriptProperties();
    const slot = 'uc.attempts.' + role;
    let budget = JSON.parse(props.getProperty(slot) || 'null');
    if (!budget || budget.until <= Date.now()) budget = {until: Date.now() + 600000, failures: 0};
    if (budget.failures >= 100) throw new Error('Trop de tentatives. Réessayez dans dix minutes.');
    const result = verify();
    if (!result) {
      budget.failures++;
      props.setProperty(slot, JSON.stringify(budget));
      throw new Error('Mot de passe ou code temporaire incorrect, ou accès désactivé. Contactez le bureau si nécessaire.');
    }
    return result;
  });
}

function loginMember(code, remember) {
  return checkLogin_('member', function() {
    const props = PropertiesService.getScriptProperties();
    const candidates = credentialCandidates_(code);
    for (let i = 0; i < candidates.length; i++) {
      const hash = candidates[i], key = props.getProperty('uc.code.' + hash);
      if (!key) continue;
      let member;
      try { member = memberByKey_(key); } catch (_) { continue; }
      if (memberCodeHash_(member) !== hash) continue;
      return {token:createAccessSession_({role:'member',key:memberKey_(member),version:hash},remember), remembered:remember === true,
        mustChoosePassword:memberCredentialKind_(member) !== 'password', profile:memberProfile_(member)};
    }
    return null;
  });
}

function loginBureau(code) {
  return checkLogin_('bureau', function() {
    const expected = clean_(getSettings_().admin_pin);
    if (!expected || accessHash_(clean_(code)) !== accessHash_(expected)) return null;
    return {token: createAccessSession_({role: 'bureau', version: accessHash_(expected)})};
  });
}

function assertMember_(token) {
  const session = accessSession_(token, 'member');
  const member = memberByKey_(session.key);
  const hash = memberCodeHash_(member);
  if (!hash || hash !== session.version) throw new Error('SESSION_EXPIRED: Votre code a changé. Reconnectez-vous.');
  return member;
}

function memberResponses_(member, year) {
  const key = memberKey_(member);
  const latest = {};
  const events = indexBy_(calendarRows_().filter(function(e) { return eventYear_(e) === Number(year) && eventForMember_(e, member); }), 'ID_Evenement');
  responseRows_().forEach(function(row) {
    if (row.Cle_Personne !== key || !events[row.ID_Evenement]) return;
    const current = latest[row.ID_Evenement];
    if (!current || asDate_(row.Horodatage) >= asDate_(current.Horodatage)) latest[row.ID_Evenement] = row;
  });
  return Object.keys(latest).map(function(id) {
    const row = latest[id], event = events[id], timestamp = asDate_(row.Horodatage);
    return {eventId: id, date: formatDate_(event.Date), title: clean_(event.Titre), cancelled: !isActive_(event.Actif),
      savedAt: timestamp ? timestamp.toISOString() : '', eventVersion: eventVersion_(event),
      response: row.Aide_Disponible === 'Oui' ? 'Disponible pour aider' : clean_(row.Reponse),
      causes: clean_(row.Causes).split(' ; ').filter(Boolean), precision: clean_(row.Precision),
      start: clean_(row.Heure_Debut_Aide), end: clean_(row.Heure_Fin_Aide), comment: clean_(row.Commentaire),
      participation: clean_(row.Participation), creneaux: clean_(row.Creneaux).split(' ; ').filter(Boolean)};
  });
}

function setMemberPassword(newPassword, confirmation, token) {
  return accessLocked_(function() {
    const member = assertMember_(token), key = memberKey_(member);
    const password = validateMemberPassword_(newPassword);
    if (password !== String(confirmation == null ? '' : confirmation)) throw new Error('Les deux mots de passe ne correspondent pas.');
    const props = PropertiesService.getScriptProperties(), hash = passwordHash_(password);
    const usedBy = props.getProperty('uc.code.' + hash);
    if (usedBy && usedBy !== key) throw new Error('Choisissez un autre mot de passe.');
    const old = memberCodeHash_(member);
    const remembered = !!props.getProperty('uc.remembered.' + accessHash_(token));
    memberAliases_(member).forEach(function(alias) {
      props.deleteProperty(memberAccessKey_(alias));
      props.deleteProperty(memberCredentialKindKey_(alias));
      pruneRememberedSessions_(alias, true);
    });
    CacheService.getScriptCache().remove('uc.session.' + accessHash_(token));
    props.deleteProperty('uc.remembered.' + accessHash_(token));
    if (old) props.deleteProperty('uc.code.' + old);
    props.setProperty('uc.code.' + hash, key);
    props.setProperty(memberAccessKey_(key), hash);
    props.setProperty(memberCredentialKindKey_(key), 'password');
    const newToken = createAccessSession_({role:'member',key:key,version:hash}, remembered);
    return {ok:true,token:newToken,remembered:remembered,message:'Votre mot de passe personnel est enregistré.'};
  });
}

function listMemberAccess(token) {
  assertAdmin_(token);
  ensureAuditSchema_();
  return getRowsAsObjects_(UC_APP.sheets.membres).filter(function(m) { return m.Nom && m.Prenom; }).map(function(m) {
    const key = memberKey_(m);
    const kind = memberCredentialKind_(m);
    return Object.assign(memberProfile_(m), {key:key,active:isActive_(m.Actif),hasCode:!!memberCodeHash_(m),accessType:kind,hasPassword:kind === 'password'});
  });
}

function issueMemberCode_(key, replace) {
  const member = memberByKey_(key);
  key = memberKey_(member);
  const props = PropertiesService.getScriptProperties();
  const slot = memberAccessKey_(key);
  const old = memberCodeHash_(member);
  if (old && !replace) throw new Error('Ce membre dispose déjà d’un code. Utilisez Remplacer le code.');
  let code, hash;
  do {
    code = (Utilities.getUuid().slice(0, 8) + Utilities.getUuid().slice(0, 8)).toUpperCase();
    hash = accessHash_(code);
  } while (props.getProperty('uc.code.' + hash));
  memberAliases_(member).forEach(function(alias) {
    props.deleteProperty(memberAccessKey_(alias)); props.deleteProperty(memberCredentialKindKey_(alias)); pruneRememberedSessions_(alias, true);
  });
  props.setProperty('uc.code.' + hash, key);
  props.setProperty(slot, hash);
  props.setProperty(memberCredentialKindKey_(key), 'temporary');
  if (old) props.deleteProperty('uc.code.' + old);
  pruneRememberedSessions_(key, true);
  return {profile: memberProfile_(member), code: code.match(/.{4}/g).join('-')};
}

function sendMemberAccessEmail_(issued) {
  const profile = issued && issued.profile || {}, address = clean_(profile.email);
  if (!mailAddressValid_(address)) return {state:'no_email', address:address};
  const url = getAppUrls_().publicUrl;
  const body = [
    'Cher membre de la Cayenne de Paris,',
    '',
    'Le bureau de la Cayenne de Paris vient de créer un espace en ligne afin de faciliter la gestion des présences aux différents rendez-vous de la Cayenne : réunions, cours, agapes et autres événements.',
    '',
    'Depuis cet espace, vous pourrez indiquer pour chaque rendez-vous si vous serez présent, absent ou absent excusé.',
    'Selon l’événement, vous pourrez également préciser votre participation au repas, vos créneaux ou votre disponibilité pour aider.',
    '',
    'Important : les excuses seront désormais uniquement prises en compte lorsqu’elles auront été enregistrées via ce formulaire.',
    'Il ne sera donc plus nécessaire de transmettre votre excuse séparément au bureau.',
    '',
    'Vos réponses restent modifiables : vous pourrez revenir dans votre espace à tout moment pour corriger ou compléter une réponse déjà enregistrée.',
    '',
    'Ces informations permettent au bureau d’organiser plus facilement les réunions, les cours, les agapes, les repas, les équipes d’aide et le suivi des présences.',
    '',
    'Votre code temporaire de première connexion : ' + issued.code,
    '',
    'Lien direct vers votre espace membre :',
    url,
    '',
    'Lors de votre première connexion, l’application vous demandera de choisir votre propre mot de passe personnel.',
    'Une fois ce mot de passe choisi, le code temporaire ci-dessus ne fonctionnera plus.',
    'Votre téléphone pourra alors vous proposer d’enregistrer votre nouveau mot de passe dans son gestionnaire de mots de passe.',
    'Sur votre appareil personnel, vous pouvez également cocher « Garder ma session ouverte sur cet appareil pendant 90 jours ».',
    '',
    'Ce code temporaire est personnel. Ne le transmettez pas à une autre personne.',
    '',
    'Cayenne de Paris — Union Compagnonnique'
  ].join('\n');
  try {
    MailApp.sendEmail({to:address, subject:'important : excuse et présence', body:body, name:'Cayenne de Paris'});
    return {state:'sent', address:address};
  } catch (error) {
    return {state:'error', address:address, detail:clean_(error && error.message).slice(0,250)};
  }
}

function manageMemberCode(key, action, token) {
  const result = accessLocked_(function() {
    assertAdmin_(token);
    ensureAuditSchema_();
    if (action === 'issue' || action === 'reset') return issueMemberCode_(String(key), action === 'reset');
    if (action !== 'revoke') throw new Error('Action invalide.');
    const props = PropertiesService.getScriptProperties();
    const member = getRowsAsObjects_(UC_APP.sheets.membres).find(function(m) { return memberAliases_(m).includes(String(key)); });
    if (!member) throw new Error('Membre introuvable.');
    const old = memberCodeHash_(member);
    memberAliases_(member).forEach(function(alias) { props.deleteProperty(memberAccessKey_(alias)); props.deleteProperty(memberCredentialKindKey_(alias)); pruneRememberedSessions_(alias, true); });
    if (old) props.deleteProperty('uc.code.' + old);
    pruneRememberedSessions_(String(key), true);
    return {ok: true};
  });
  if (result && result.code) result.delivery = sendMemberAccessEmail_(result);
  return result;
}

function createMemberAccess(payload, token) {
  const result = accessLocked_(function() {
    assertAdmin_(token);
    ensureAuditSchema_();
    payload = payload || {};
    const member = {Nom: clean_(payload.nom), Prenom: clean_(payload.prenom), Statut: clean_(payload.statut),
      Cayenne: clean_(payload.cayenne), Email: clean_(payload.email), Telephone: clean_(payload.telephone), Actif: 'Oui'};
    if (!member.Nom || !member.Prenom) throw new Error('Nom et prénom obligatoires.');
    if (!getOptionList_('D', UC_APP.defaults.statuses).includes(member.Statut) || !getOptionList_('E', UC_APP.defaults.cayennes).includes(member.Cayenne)) throw new Error('Choisissez un statut et une Cayenne dans les listes.');
    if (Object.keys(member).some(function(k) { return member[k].length > 200 || /^[=+@]/.test(member[k]); })) throw new Error('Un champ est invalide ou trop long.');
    if (getRowsAsObjects_(UC_APP.sheets.membres).some(function(m) { return legacyMemberKey_(m) === legacyMemberKey_(member); })) throw new Error('Ce membre existe déjà. Créez son code depuis la liste.');
    if (member.Email && !mailAddressValid_(member.Email)) throw new Error('Adresse mail invalide.');
    member.ID_Membre = 'MEM-' + Utilities.getUuid();
    member.Cle_Historique = '';
    const key = memberKey_(member);
    queueFollowup_(calendarRows_().map(function(e) { return e.ID_Evenement; }));
    upsertMember_(member);
    return issueMemberCode_(key, false);
  });
  if (result && result.code) result.delivery = sendMemberAccessEmail_(result);
  return result;
}

function changeBureauCode(newCode, token) {
  return accessLocked_(function() {
    assertAdmin_(token);
    const code = clean_(newCode);
    if (code.length < 8 || code.length > 80 || /^=/.test(code)) throw new Error('Le code du bureau doit contenir entre 8 et 80 caractères.');
    const sheet = getSpreadsheet_().getSheetByName(UC_APP.sheets.parametres);
    const rows = sheet.getRange(1, 1, Math.min(sheet.getLastRow(), 50), 1).getValues();
    const index = rows.findIndex(function(row) { return row[0] === 'admin_pin'; });
    if (index < 0) throw new Error('Paramètre admin_pin introuvable.');
    sheet.getRange(index + 1, 2).setNumberFormat('@').setValue(code);
    return {ok: true};
  });
}
