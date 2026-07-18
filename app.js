(function () {
  "use strict";

  const STORAGE_KEY = "confcontactmgr.contacts.v1";
  const APP_ID = "confcontactmgr";
  const APP_VERSION = 1;

  const state = {
    contacts: [],
    editingId: null,
    searchTerm: ""
  };

  const refs = {
    addView: document.getElementById("add-view"),
    listView: document.getElementById("list-view"),
    count: document.getElementById("saved-count"),
    status: document.getElementById("status-region"),
    form: document.getElementById("contact-form"),
    name: document.getElementById("name"),
    phone: document.getElementById("phone"),
    email: document.getElementById("email"),
    company: document.getElementById("company"),
    jobTitle: document.getElementById("jobTitle"),
    vendors: document.getElementById("vendors"),
    conference: document.getElementById("conference"),
    location: document.getElementById("location"),
    dateMet: document.getElementById("dateMet"),
    notes: document.getElementById("notes"),
    search: document.getElementById("search-input"),
    contactsList: document.getElementById("contacts-list"),
    noContactsMessage: document.getElementById("no-contacts-message"),
    importInput: document.getElementById("import-file-input"),
    btnShowAdd: document.getElementById("btn-show-add"),
    btnShowList: document.getElementById("btn-show-list"),
    btnImport: document.getElementById("btn-import"),
    btnExport: document.getElementById("btn-export"),
    btnClearAll: document.getElementById("btn-clear-all"),
    btnSave: document.getElementById("btn-save"),
    btnClearForm: document.getElementById("btn-clear-form"),
    btnUpdate: document.getElementById("btn-update"),
    btnCancelEdit: document.getElementById("btn-cancel-edit")
  };

  init();

  function init() {
    bindEvents();
    refs.dateMet.value = todayForInput();
    loadContacts();
    renderCount();
    renderContacts();
    showAddView();
    setStatus("Info: Ready.", "info");
  }

  function bindEvents() {
    refs.btnShowAdd.addEventListener("click", showAddView);
    refs.btnShowList.addEventListener("click", showListView);
    refs.btnExport.addEventListener("click", handleExport);
    refs.btnImport.addEventListener("click", function () {
      refs.importInput.click();
    });
    refs.btnClearAll.addEventListener("click", handleClearAll);

    refs.btnClearForm.addEventListener("click", clearForm);
    refs.btnCancelEdit.addEventListener("click", cancelEditMode);

    refs.form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (state.editingId) {
        updateContact();
      } else {
        saveNewContact();
      }
    });

    refs.search.addEventListener("input", function (event) {
      state.searchTerm = sanitizeText(event.target.value).toLowerCase();
      renderContacts();
    });

    refs.contactsList.addEventListener("click", onContactAction);
    refs.importInput.addEventListener("change", handleImportFile);
  }

  function loadContacts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.contacts = [];
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error("Stored contacts must be an array.");
      }

      state.contacts = parsed.map(function (item) {
        return normalizeImportedContact(item);
      });
    } catch (error) {
      state.contacts = [];
      setStatus("Browser-storage error: could not read saved contacts.", "error");
    }
  }

  function persistContacts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.contacts));
  }

  function saveNewContact() {
    const formData = collectFormData();
    const validationMessage = validateFormData(formData);
    if (validationMessage) {
      setStatus("Validation error: " + validationMessage, "error");
      return;
    }

    const timestamp = new Date().toISOString();
    const contact = {
      id: generateId(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      company: formData.company,
      jobTitle: formData.jobTitle,
      vendors: parseVendors(formData.vendors),
      conference: formData.conference,
      location: formData.location,
      dateMet: formData.dateMet || todayForInput(),
      notes: formData.notes,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    try {
      state.contacts.push(contact);
      persistContacts();
      clearForm();
      renderCount();
      renderContacts();
      setStatus("Contact saved.", "success");
    } catch (error) {
      setStatus("Browser-storage error: could not save contact.", "error");
    }
  }

  function updateContact() {
    const formData = collectFormData();
    const validationMessage = validateFormData(formData);
    if (validationMessage) {
      setStatus("Validation error: " + validationMessage, "error");
      return;
    }

    const index = state.contacts.findIndex(function (contact) {
      return contact.id === state.editingId;
    });

    if (index < 0) {
      cancelEditMode();
      setStatus("Validation error: selected contact no longer exists.", "error");
      return;
    }

    const existing = state.contacts[index];
    const updated = {
      id: existing.id,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      company: formData.company,
      jobTitle: formData.jobTitle,
      vendors: parseVendors(formData.vendors),
      conference: formData.conference,
      location: formData.location,
      dateMet: formData.dateMet || todayForInput(),
      notes: formData.notes,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    try {
      state.contacts[index] = updated;
      persistContacts();
      cancelEditMode();
      renderCount();
      renderContacts();
      setStatus("Contact updated.", "success");
    } catch (error) {
      setStatus("Browser-storage error: could not update contact.", "error");
    }
  }

  function onContactAction(event) {
    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) {
      return;
    }

    const card = actionButton.closest(".contact-card");
    if (!card) {
      return;
    }

    const contactId = card.getAttribute("data-id");
    const action = actionButton.getAttribute("data-action");

    if (action === "view") {
      toggleViewDetails(card, actionButton);
      return;
    }

    if (action === "edit") {
      enterEditMode(contactId);
      return;
    }

    if (action === "delete") {
      deleteContact(contactId);
    }
  }

  function toggleViewDetails(card, actionButton) {
    const details = card.querySelector(".contact-details");
    if (!details) {
      return;
    }

    const isHidden = details.classList.contains("hidden");
    details.classList.toggle("hidden", !isHidden);
    actionButton.textContent = isHidden ? "Hide" : "View";
  }

  function enterEditMode(contactId) {
    const contact = state.contacts.find(function (item) {
      return item.id === contactId;
    });

    if (!contact) {
      setStatus("Validation error: selected contact no longer exists.", "error");
      return;
    }

    state.editingId = contact.id;
    refs.name.value = contact.name;
    refs.phone.value = contact.phone;
    refs.email.value = contact.email;
    refs.company.value = contact.company;
    refs.jobTitle.value = contact.jobTitle;
    refs.vendors.value = Array.isArray(contact.vendors) ? contact.vendors.join(", ") : "";
    refs.conference.value = contact.conference;
    refs.location.value = contact.location;
    refs.dateMet.value = contact.dateMet || todayForInput();
    refs.notes.value = contact.notes;

    refs.btnSave.classList.add("hidden");
    refs.btnClearForm.classList.add("hidden");
    refs.btnUpdate.classList.remove("hidden");
    refs.btnCancelEdit.classList.remove("hidden");

    showAddView();
    setStatus("Info: editing contact.", "info");
  }

  function cancelEditMode() {
    state.editingId = null;
    refs.btnSave.classList.remove("hidden");
    refs.btnClearForm.classList.remove("hidden");
    refs.btnUpdate.classList.add("hidden");
    refs.btnCancelEdit.classList.add("hidden");
    clearForm();
  }

  function deleteContact(contactId) {
    const contact = state.contacts.find(function (item) {
      return item.id === contactId;
    });

    if (!contact) {
      setStatus("Validation error: selected contact no longer exists.", "error");
      return;
    }

    const confirmed = window.confirm("Delete this contact? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      state.contacts = state.contacts.filter(function (item) {
        return item.id !== contactId;
      });
      persistContacts();
      renderCount();
      renderContacts();
      setStatus("Contact deleted.", "success");
    } catch (error) {
      setStatus("Browser-storage error: could not delete contact.", "error");
    }
  }

  function handleExport() {
    try {
      const payload = {
        application: APP_ID,
        version: APP_VERSION,
        exportedAt: new Date().toISOString(),
        contactCount: state.contacts.length,
        contacts: state.contacts
      };

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = createExportFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setStatus("Export completed.", "success");
    } catch (error) {
      setStatus("Browser-storage error: export failed.", "error");
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    try {
      if (!file.name.toLowerCase().endsWith(".json")) {
        throw new Error("Please select a .json file.");
      }

      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = validateImportPayload(parsed);
      const decision = requestImportDecision();

      if (decision === "cancel") {
        setStatus("Info: import canceled.", "info");
        return;
      }

      let nextContacts = [];
      let completionMessage = "Import completed.";
      if (decision === "merge") {
        const existingSignatures = new Set(
          state.contacts.map(function (contact) {
            return createContactSignature(contact);
          })
        );

        const uniqueImported = [];
        let addedCount = 0;
        let skippedCount = 0;

        imported.forEach(function (contact) {
          const signature = createContactSignature(contact);
          if (existingSignatures.has(signature)) {
            skippedCount += 1;
            return;
          }

          existingSignatures.add(signature);
          uniqueImported.push(contact);
          addedCount += 1;
        });

        nextContacts = state.contacts.concat(uniqueImported);
        completionMessage =
          "Import completed. Added " +
          addedCount +
          " contact(s), skipped " +
          skippedCount +
          " duplicate(s).";
      } else {
        const replaceConfirmed = window.confirm("Replace all existing contacts with imported contacts?");
        if (!replaceConfirmed) {
          setStatus("Info: import canceled.", "info");
          return;
        }
        nextContacts = imported;
      }

      state.contacts = nextContacts;
      persistContacts();
      renderCount();
      renderContacts();
      setStatus(completionMessage, "success");
    } catch (error) {
      setStatus("Import failed: " + error.message, "error");
    } finally {
      refs.importInput.value = "";
    }
  }

  function requestImportDecision() {
    const input = window.prompt("Import options: type M for merge, R for replace, or C to cancel.", "M");
    const choice = sanitizeText(input).toUpperCase();

    if (choice === "M") {
      return "merge";
    }
    if (choice === "R") {
      return "replace";
    }
    return "cancel";
  }

  function validateImportPayload(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Root JSON value must be an object.");
    }

    if (payload.application !== APP_ID) {
      throw new Error("Invalid application identifier.");
    }

    if (payload.version !== APP_VERSION) {
      throw new Error("Unsupported export version.");
    }

    if (!Array.isArray(payload.contacts)) {
      throw new Error("Contacts must be an array.");
    }

    const normalized = payload.contacts.map(function (entry) {
      const name = sanitizeText(entry && entry.name);
      if (!name) {
        throw new Error("Every imported contact must have a non-empty name.");
      }
      return normalizeImportedContact(entry);
    });

    return normalized;
  }

  function normalizeImportedContact(input) {
    const now = new Date().toISOString();
    const safe = input && typeof input === "object" ? input : {};

    return {
      id: sanitizeText(safe.id) || generateId(),
      name: sanitizeText(safe.name),
      phone: sanitizeText(safe.phone),
      email: sanitizeText(safe.email),
      company: sanitizeText(safe.company),
      jobTitle: sanitizeText(safe.jobTitle),
      vendors: normalizeVendors(safe.vendors),
      conference: sanitizeText(safe.conference),
      location: sanitizeText(safe.location),
      dateMet: sanitizeText(safe.dateMet) || todayForInput(),
      notes: sanitizeText(safe.notes),
      createdAt: sanitizeText(safe.createdAt) || now,
      updatedAt: sanitizeText(safe.updatedAt) || now
    };
  }

  function normalizeVendors(vendorsValue) {
    if (Array.isArray(vendorsValue)) {
      return vendorsValue
        .map(function (value) {
          return sanitizeText(value);
        })
        .filter(Boolean);
    }

    return parseVendors(sanitizeText(vendorsValue));
  }

  function createContactSignature(contact) {
    const safe = contact && typeof contact === "object" ? contact : {};
    const vendorsToken = normalizeVendorsForSignature(safe.vendors);

    const parts = [
      safe.name,
      safe.phone,
      safe.email,
      safe.company,
      safe.jobTitle,
      safe.conference,
      safe.location,
      vendorsToken
    ].map(function (value) {
      return normalizeSignatureValue(value);
    });

    return parts.join("|");
  }

  function normalizeVendorsForSignature(vendorsValue) {
    const vendors = normalizeVendors(vendorsValue)
      .map(function (value) {
        return normalizeSignatureValue(value);
      })
      .filter(Boolean)
      .sort();

    return vendors.join(",");
  }

  function normalizeSignatureValue(value) {
    return sanitizeText(value).toLowerCase();
  }

  function handleClearAll() {
    const confirmed = window.confirm(
      "This will remove all contacts stored in this browser. Continue?"
    );

    if (!confirmed) {
      setStatus("Info: clear all canceled.", "info");
      return;
    }

    try {
      state.contacts = [];
      state.editingId = null;
      localStorage.removeItem(STORAGE_KEY);
      renderCount();
      renderContacts();
      clearForm();
      setStatus("All contacts cleared.", "success");
    } catch (error) {
      setStatus("Browser-storage error: could not clear contacts.", "error");
    }
  }

  function renderCount() {
    refs.count.textContent = String(state.contacts.length);
  }

  function renderContacts() {
    const query = state.searchTerm;
    const filtered = state.contacts.filter(function (contact) {
      if (!query) {
        return true;
      }

      const searchText = [
        contact.name,
        contact.phone,
        contact.email,
        contact.company,
        contact.jobTitle,
        (contact.vendors || []).join(" "),
        contact.conference,
        contact.location,
        contact.notes
      ]
        .join(" ")
        .toLowerCase();

      return searchText.indexOf(query) >= 0;
    });

    refs.noContactsMessage.classList.toggle("hidden", filtered.length > 0);

    refs.contactsList.innerHTML = filtered
      .map(function (contact) {
        return renderContactCard(contact);
      })
      .join("");
  }

  function renderContactCard(contact) {
    const phoneMarkup = contact.phone
      ? '<a href="tel:' + escapeHtmlAttr(contact.phone) + '">' + escapeHtml(contact.phone) + "</a>"
      : "Not provided";

    const emailMarkup = contact.email
      ? '<a href="mailto:' + escapeHtmlAttr(contact.email) + '">' + escapeHtml(contact.email) + "</a>"
      : "Not provided";

    return [
      '<article class="contact-card" data-id="' + escapeHtmlAttr(contact.id) + '">',
      '  <div class="contact-summary">',
      '    <h3 class="contact-name">' + escapeHtml(contact.name) + "</h3>",
      '    <p>' + escapeHtml([contact.jobTitle, contact.company].filter(Boolean).join(", ")) + "</p>",
      '    <p class="muted">Conference: ' + escapeHtml(contact.conference || "-") + " | Location: " + escapeHtml(contact.location || "-") + "</p>",
      "  </div>",
      '  <div class="card-actions">',
      '    <button type="button" class="btn" data-action="view">View</button>',
      '    <button type="button" class="btn" data-action="edit">Edit</button>',
      '    <button type="button" class="btn btn-danger" data-action="delete">Delete</button>',
      "  </div>",
      '  <div class="contact-details hidden">',
      '    <p><strong>ID:</strong> ' + escapeHtml(contact.id || "-") + "</p>",
      '    <p><strong>Phone:</strong> ' + phoneMarkup + "</p>",
      '    <p><strong>Email:</strong> ' + emailMarkup + "</p>",
      '    <p><strong>Vendors:</strong> ' + escapeHtml((contact.vendors || []).join(", ") || "-") + "</p>",
      '    <p><strong>Date Met:</strong> ' + escapeHtml(contact.dateMet || "-") + "</p>",
      '    <p><strong>Notes:</strong> ' + escapeHtml(contact.notes || "-") + "</p>",
      '    <p><strong>Created:</strong> ' + escapeHtml(contact.createdAt || "-") + "</p>",
      '    <p><strong>Updated:</strong> ' + escapeHtml(contact.updatedAt || "-") + "</p>",
      "  </div>",
      "</article>"
    ].join("\n");
  }

  function showAddView() {
    refs.addView.classList.remove("hidden");
    refs.listView.classList.add("hidden");
    refs.btnShowAdd.setAttribute("aria-pressed", "true");
    refs.btnShowList.setAttribute("aria-pressed", "false");
  }

  function showListView() {
    refs.listView.classList.remove("hidden");
    refs.addView.classList.add("hidden");
    refs.btnShowAdd.setAttribute("aria-pressed", "false");
    refs.btnShowList.setAttribute("aria-pressed", "true");
  }

  function clearForm() {
    refs.form.reset();
    refs.dateMet.value = todayForInput();
  }

  function collectFormData() {
    return {
      name: sanitizeText(refs.name.value),
      phone: sanitizeText(refs.phone.value),
      email: sanitizeText(refs.email.value),
      company: sanitizeText(refs.company.value),
      jobTitle: sanitizeText(refs.jobTitle.value),
      vendors: sanitizeText(refs.vendors.value),
      conference: sanitizeText(refs.conference.value),
      location: sanitizeText(refs.location.value),
      dateMet: sanitizeText(refs.dateMet.value),
      notes: sanitizeText(refs.notes.value)
    };
  }

  function validateFormData(formData) {
    if (!formData.name) {
      return "Full Name is required.";
    }

    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      return "Phone number is invalid. Use digits only with optional leading + ISD code.";
    }

    if (formData.email && !isValidEmail(formData.email)) {
      return "Email format is invalid.";
    }

    return "";
  }

  function parseVendors(input) {
    return input
      .split(",")
      .map(function (value) {
        return sanitizeText(value);
      })
      .filter(Boolean);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isValidPhoneNumber(value) {
    return /^\+?\d+$/.test(value);
  }

  function createExportFileName() {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return "conference-contacts-" + yyyy + "-" + mm + "-" + dd + "-" + hh + min + ".json";
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    const randomPart = Math.random().toString(36).slice(2, 10);
    return "fallback-" + Date.now() + "-" + randomPart;
  }

  function todayForInput() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function sanitizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  function setStatus(message, kind) {
    refs.status.classList.remove("success", "error", "info");
    refs.status.classList.add(kind || "info");
    refs.status.textContent = message;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeHtmlAttr(value) {
    return escapeHtml(value);
  }
})();
