const HOLD_DURATION_MS = 3000;

const sosBtn = document.getElementById("sosBtn");
const sosProgress = sosBtn ? sosBtn.querySelector(".sos-progress") : null;
const sosStatus = document.getElementById("sosStatus");

const locationBtn = document.getElementById("locationBtn");
const locationText = document.getElementById("locationText");

const contactInput = document.getElementById("contactInput");
const contactNameInput = document.getElementById("contactNameInput");
const saveContact = document.getElementById("saveContact");
const contactList = document.getElementById("contactList");
const contactError = document.getElementById("contactError");
const outgoingCallModal = document.getElementById("outgoingCallModal");
const callingName = document.getElementById("callingName");
const callingNumber = document.getElementById("callingNumber");
const endOutgoingCallBtn = document.getElementById("endOutgoingCallBtn");

const fakeCallBtn = document.getElementById("fakeCallBtn");
const fakeCallScreen = document.getElementById("fakeCallScreen");
const fakeCallTitle = document.getElementById("fakeCallTitle");
const fakeCallSubtitle = document.getElementById("fakeCallSubtitle");
const incomingCallActions = document.getElementById("incomingCallActions");
const activeCallState = document.getElementById("activeCallState");
const acceptFakeCallBtn = document.getElementById("acceptFakeCallBtn");
const declineFakeCallBtn = document.getElementById("declineFakeCallBtn");
const endFakeCallBtn = document.getElementById("endFakeCallBtn");

const reviewStars = document.querySelectorAll("#starRating .star");
const reviewSubmit = document.getElementById("reviewSubmit");
const cancelEditReviewBtn = document.getElementById("cancelEditReview");
const reviewText = document.getElementById("reviewText");
const reviewList = document.getElementById("reviewList");
const reviewSummary = document.getElementById("reviewSummary");
const logoutBtn = document.getElementById("logoutBtn");
const currentUserLabel = document.getElementById("currentUserLabel");

const REVIEWS_API_URL = "api/reviews_api.php";
let selectedRating = 0;
let reviews = JSON.parse(localStorage.getItem("reviews")) || [];

function getCurrentUser() {
    try {
        const parsed = JSON.parse(localStorage.getItem("currentUser") || "null");
        if (!parsed || typeof parsed.id !== "string" || !parsed.id.trim()) {
            return null;
        }

        return parsed;
    } catch (error) {
        return null;
    }
}

const currentPath = window.location.pathname.split("/").pop().toLowerCase();
const isAuthPage = currentPath === "login.html" || currentPath === "register.html";
const currentUser = getCurrentUser();

if (!isAuthPage && !currentUser) {
    window.location.href = "login.html";
}

const userId = currentUser?.id || "";
let activeReviewEditId = null;
let isGlobalReviewMode = false;

let contacts = loadContacts();
let sosHoldActive = false;
let sosHoldTriggered = false;
let sosHoldStart = 0;
let sosHoldTimeoutId = null;
let sosHoldFrameId = null;
let activeFakeCaller = "Unknown Caller";
let ringtoneContext = null;
let ringtoneIntervalId = null;

if (currentUserLabel) {
    currentUserLabel.textContent = currentUser?.name
        ? `Signed in as ${currentUser.name}`
        : "Signed in";
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("currentUser");
        window.location.href = "login.html";
    });
}

function setText(element, value) {
    if (element) {
        element.textContent = value;
    }
}

function setHtml(element, value) {
    if (element) {
        element.innerHTML = value;
    }
}

function setButtonLoading(button, isLoading, loadingText = "Loading...") {
    if (!button) {
        return;
    }

    if (isLoading) {
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent || "";
        }

        button.disabled = true;
        button.classList.add("is-loading");
        button.setAttribute("aria-busy", "true");
        button.textContent = loadingText;
        return;
    }

    button.disabled = false;
    button.classList.remove("is-loading");
    button.removeAttribute("aria-busy");
    if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
    }
}

function setSosProgress(value) {
    if (sosProgress) {
        sosProgress.style.setProperty("--sos-progress", `${Math.max(0, Math.min(100, value))}%`);
    }
}

function setSosHint(value) {
    setText(sosStatus, value);
}

function updateSosProgress() {
    if (!sosHoldActive || sosHoldTriggered) {
        return;
    }

    const elapsed = performance.now() - sosHoldStart;
    setSosProgress((elapsed / HOLD_DURATION_MS) * 100);

    if (elapsed < HOLD_DURATION_MS) {
        sosHoldFrameId = window.requestAnimationFrame(updateSosProgress);
    }
}

function resetSosHold(showHint = true) {
    if (sosHoldTimeoutId) {
        clearTimeout(sosHoldTimeoutId);
        sosHoldTimeoutId = null;
    }

    if (sosHoldFrameId) {
        cancelAnimationFrame(sosHoldFrameId);
        sosHoldFrameId = null;
    }

    sosHoldActive = false;

    if (sosBtn) {
        sosBtn.classList.remove("is-holding");
    }

    if (!sosHoldTriggered) {
        setSosProgress(0);
        if (showHint) {
            setSosHint("Hold for 3 seconds to activate the emergency alert.");
        }
    }
}

function runEmergencyProtocol(reason = "manual") {
    setSosProgress(100);

    const reasonLabels = {
        manual: "SOS activated. Alert sent to emergency contacts.",
        "acoustic-detection": "AI Guardian detected a distress sound. Alert sent to emergency contacts.",
        "voice-trigger": "Code word confirmed. Alert sent to emergency contacts."
    };

    setSosHint(reasonLabels[reason] || reasonLabels.manual);

    window.setTimeout(() => {
        alert("🚨 SOS Activated! Help is on the way.");
    }, 0);

    window.dispatchEvent(new CustomEvent("emergency-protocol-activated", { detail: { reason } }));
}

// Exposed so other modules (e.g. AI Guardian acoustic/voice detection) can
// trigger the same emergency flow as the manual hold-to-activate button.
window.activateEmergencyProtocol = runEmergencyProtocol;

function triggerSosAlert() {
    if (!sosHoldActive || sosHoldTriggered) {
        return;
    }

    sosHoldTriggered = true;
    sosHoldActive = false;

    if (sosBtn) {
        sosBtn.classList.remove("is-holding");
    }

    runEmergencyProtocol("manual");
}

function startSosHold(event) {
    if (!sosBtn || sosHoldActive) {
        return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
        return;
    }

    event.preventDefault();
    sosHoldActive = true;
    sosHoldTriggered = false;
    sosHoldStart = performance.now();

    if (sosBtn.setPointerCapture && typeof event.pointerId === "number") {
        try {
            sosBtn.setPointerCapture(event.pointerId);
        } catch (error) {
            // Ignore capture failures on browsers that do not support it reliably.
        }
    }

    sosBtn.classList.add("is-holding");
    setSosHint("Keep holding to activate SOS...");
    setSosProgress(0);

    sosHoldTimeoutId = window.setTimeout(triggerSosAlert, HOLD_DURATION_MS);
    sosHoldFrameId = window.requestAnimationFrame(updateSosProgress);
}

function endSosHold() {
    if (!sosHoldActive && !sosHoldTriggered) {
        return;
    }

    const wasTriggered = sosHoldTriggered;
    resetSosHold(!wasTriggered);

    if (wasTriggered) {
        window.setTimeout(() => {
            sosHoldTriggered = false;
            setSosProgress(0);
            setSosHint("Hold for 3 seconds to activate the emergency alert.");
        }, 400);
    }
}

if (sosBtn) {
    sosBtn.addEventListener("pointerdown", startSosHold);
    sosBtn.addEventListener("pointerup", endSosHold);
    sosBtn.addEventListener("pointerleave", endSosHold);
    sosBtn.addEventListener("pointercancel", endSosHold);
    sosBtn.addEventListener("contextmenu", (event) => event.preventDefault());
    setSosHint("Hold for 3 seconds to activate the emergency alert.");
}

function renderLocationResult(position) {
    if (!locationText) {
        return;
    }

    const latitude = position.coords.latitude.toFixed(6);
    const longitude = position.coords.longitude.toFixed(6);
    const accuracy = Math.max(1, Math.round(position.coords.accuracy));
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    setHtml(
        locationText,
        `Latitude: ${latitude}<br>Longitude: ${longitude}<br>Accuracy: ±${accuracy}m<br><a href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>`
    );
}

function showLocationError(message) {
    if (locationText) {
        setText(locationText, message);
    }
}

if (locationBtn && locationText) {
    locationBtn.addEventListener("click", () => {
        if (!navigator.geolocation) {
            showLocationError("Geolocation is not supported in this browser.");
            return;
        }

        setButtonLoading(locationBtn, true, "Locating...");
        setText(locationText, "Getting accurate location... Please allow GPS access.");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                renderLocationResult(position);
                setButtonLoading(locationBtn, false);
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    showLocationError("Location permission denied. Please allow access in the browser and system settings.");
                    setButtonLoading(locationBtn, false);
                    return;
                }

                if (error.code === error.TIMEOUT) {
                    showLocationError("Location request timed out. Try again outdoors or with a stronger GPS signal.");
                    setButtonLoading(locationBtn, false);
                    return;
                }

                if (error.code === error.POSITION_UNAVAILABLE) {
                    showLocationError("Location unavailable. Enable GPS or move to an area with better signal.");
                    setButtonLoading(locationBtn, false);
                    return;
                }

                showLocationError(`Unable to get location: ${error.message}`);
                setButtonLoading(locationBtn, false);
            },
            {
                enableHighAccuracy: true,
                timeout: 60000,
                maximumAge: 0
            }
        );
    });
}

function loadContacts() {
    const storedContacts = JSON.parse(localStorage.getItem("contacts")) || [];

    return storedContacts
        .map((contact) => {
            if (typeof contact === "string") {
                return { name: "Saved Contact", number: contact };
            }

            return {
                name: String(contact.name || "Saved Contact").trim(),
                number: String(contact.number || "").trim()
            };
        })
        .filter((contact) => contact.number);
}

function saveContacts() {
    localStorage.setItem("contacts", JSON.stringify(contacts));
}

function setContactError(message) {
    if (contactError) {
        contactError.textContent = message;
    }
}

function validateContactInput(name, number) {
    if (!name || !number) {
        return "Please enter both a name and phone number.";
    }

    if (!/[0-9]/.test(number)) {
        return "Phone number must contain at least one digit.";
    }

    return "";
}

function displayContacts() {
    if (!contactList) {
        return;
    }

    contactList.innerHTML = "";

    contacts.forEach((contact, index) => {
        const listItem = document.createElement("li");

        const info = document.createElement("span");
        info.innerHTML = `<strong>${contact.name}</strong> - ${contact.number}`;

        const actions = document.createElement("span");

        const callButton = document.createElement("button");
        callButton.type = "button";
        callButton.className = "call-saved-contact";
        callButton.textContent = "Call";
        callButton.addEventListener("click", () => {
            showOutgoingCall(contact.name || "Saved Contact", contact.number || "Unknown number");
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "❌";
        deleteButton.addEventListener("click", () => {
            removeContact(index);
        });

        actions.append(callButton, deleteButton);
        listItem.append(info, actions);
        contactList.appendChild(listItem);
    });
}

function removeContact(index) {
    if (index < 0 || index >= contacts.length) {
        return;
    }

    contacts.splice(index, 1);
    saveContacts();
    displayContacts();
}

if (saveContact && contactInput && contactNameInput) {
    saveContact.addEventListener("click", () => {
        const name = contactNameInput.value.trim();
        const number = contactInput.value.trim();
        const validationMessage = validateContactInput(name, number);

        if (validationMessage) {
            setContactError(validationMessage);
            return;
        }

        contacts.unshift({ name, number });
        saveContacts();
        contactNameInput.value = "";
        contactInput.value = "";
        setContactError("");
        displayContacts();
    });

    [contactNameInput, contactInput].forEach((input) => {
        input.addEventListener("input", () => {
            setContactError("");
        });
    });
}

displayContacts();

function showOutgoingCall(name, number) {
    if (!outgoingCallModal || !callingName || !callingNumber) {
        alert(`Calling ${name} - ${number}...`);
        return;
    }

    callingName.textContent = name;
    callingNumber.textContent = number;
    outgoingCallModal.hidden = false;
    outgoingCallModal.classList.add("visible");
    outgoingCallModal.setAttribute("aria-hidden", "false");
}

function hideOutgoingCall() {
    if (!outgoingCallModal) {
        return;
    }

    outgoingCallModal.classList.remove("visible");
    outgoingCallModal.setAttribute("aria-hidden", "true");
    outgoingCallModal.hidden = true;
}

const callIcons = document.querySelectorAll(".call-icon");
callIcons.forEach((icon) => {
    icon.addEventListener("click", (event) => {
        event.preventDefault();
        showOutgoingCall(icon.dataset.name || "Local Police", icon.dataset.number || "Unknown number");
    });
});

if (endOutgoingCallBtn) {
    endOutgoingCallBtn.addEventListener("click", hideOutgoingCall);
}

if (outgoingCallModal) {
    outgoingCallModal.addEventListener("click", (event) => {
        if (event.target === outgoingCallModal) {
            hideOutgoingCall();
        }
    });
}

const callModalCard = document.querySelector(".call-modal-card");
if (callModalCard) {
    callModalCard.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

function ensureRingtoneContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        return null;
    }

    if (!ringtoneContext) {
        ringtoneContext = new AudioContextClass();
    }

    if (ringtoneContext.state === "suspended") {
        ringtoneContext.resume().catch(() => {});
    }

    return ringtoneContext;
}

function playRingtoneBurst() {
    const context = ensureRingtoneContext();

    if (!context) {
        return;
    }

    const scheduleTone = (frequency, startOffset) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        const startTime = context.currentTime + startOffset;

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.14, startTime + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.24);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.26);
    };

    scheduleTone(620, 0);
    scheduleTone(820, 0.28);
}

function startRingtone() {
    if (ringtoneIntervalId) {
        return;
    }

    playRingtoneBurst();
    ringtoneIntervalId = window.setInterval(playRingtoneBurst, 1600);
}

function stopRingtone() {
    if (ringtoneIntervalId) {
        clearInterval(ringtoneIntervalId);
        ringtoneIntervalId = null;
    }
}

function openFakeCall() {
    if (!fakeCallScreen) {
        return;
    }

    const callers = ["Mom", "Dad", "Sister", "Best Friend", "Unknown Caller"];
    activeFakeCaller = callers[Math.floor(Math.random() * callers.length)] || "Unknown Caller";

    if (fakeCallTitle) {
        fakeCallTitle.textContent = activeFakeCaller;
    }

    if (fakeCallSubtitle) {
        fakeCallSubtitle.textContent = "Ringing...";
    }

    if (incomingCallActions) {
        incomingCallActions.hidden = false;
    }

    if (activeCallState) {
        activeCallState.hidden = true;
    }

    fakeCallScreen.hidden = false;
    fakeCallScreen.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
        fakeCallScreen.classList.add("visible");
    });
    startRingtone();
}

function closeFakeCall() {
    if (!fakeCallScreen) {
        return;
    }

    stopRingtone();
    fakeCallScreen.classList.remove("visible");
    fakeCallScreen.hidden = true;
    fakeCallScreen.setAttribute("aria-hidden", "true");

    if (incomingCallActions) {
        incomingCallActions.hidden = false;
    }

    if (activeCallState) {
        activeCallState.hidden = true;
    }

    if (fakeCallSubtitle) {
        fakeCallSubtitle.textContent = "Ringing...";
    }
}

function acceptFakeCall() {
    if (!fakeCallScreen) {
        return;
    }

    stopRingtone();

    if (incomingCallActions) {
        incomingCallActions.hidden = true;
    }

    if (activeCallState) {
        activeCallState.hidden = false;
    }

    if (fakeCallSubtitle) {
        fakeCallSubtitle.textContent = `Connected with ${activeFakeCaller}.`;
    }
}

function declineFakeCall() {
    closeFakeCall();
}

if (fakeCallBtn) {
    fakeCallBtn.addEventListener("click", openFakeCall);
}

if (acceptFakeCallBtn) {
    acceptFakeCallBtn.addEventListener("click", acceptFakeCall);
}

if (declineFakeCallBtn) {
    declineFakeCallBtn.addEventListener("click", declineFakeCall);
}

if (endFakeCallBtn) {
    endFakeCallBtn.addEventListener("click", closeFakeCall);
}

if (fakeCallScreen) {
    fakeCallScreen.addEventListener("click", (event) => {
        if (event.target === fakeCallScreen) {
            closeFakeCall();
        }
    });
}

const fakeCallPanel = document.querySelector(".fake-call-panel");
if (fakeCallPanel) {
    fakeCallPanel.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

function setSelectedRating(value) {
    selectedRating = Number(value) || 0;
    reviewStars.forEach((item) => {
        const starValue = Number(item.dataset.value);
        item.classList.toggle("active", starValue <= selectedRating);
    });
}

function resetReviewForm() {
    activeReviewEditId = null;
    if (reviewText) {
        reviewText.value = "";
    }

    setSelectedRating(0);

    if (reviewSubmit) {
        reviewSubmit.textContent = "Submit Review";
    }

    if (cancelEditReviewBtn) {
        cancelEditReviewBtn.hidden = true;
    }
}

function normalizeReviews(inputReviews) {
    if (!Array.isArray(inputReviews)) {
        return [];
    }

    return inputReviews
        .map((item) => {
            const rating = Number(item.rating) || 0;
            const text = String(item.text || "").trim();

            if (!rating || !text) {
                return null;
            }

            return {
                id: item.id || `local_${Math.random().toString(36).slice(2)}`,
                rating,
                text,
                userId: typeof item.userId === "string" ? item.userId : "",
                createdAt: Number(item.createdAt) || Date.now()
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.createdAt - a.createdAt);
}

async function requestReviewsApi(payload) {
    const response = await fetch(REVIEWS_API_URL, {
        method: payload ? "POST" : "GET",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined
    });

    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    if (data?.error || response.status === 403) {
        alert("Not allowed!");
    }

    if (!response.ok) {
        throw new Error(data?.message || `Server request failed (${response.status})`);
    }

    if (!data || !data.ok || !Array.isArray(data.reviews)) {
        throw new Error(data.message || "Invalid response from review server");
    }

    return normalizeReviews(data.reviews);
}

async function loadReviews() {
    if (!reviewList) {
        return;
    }

    try {
        reviews = await requestReviewsApi();
        isGlobalReviewMode = true;
        localStorage.setItem("reviews", JSON.stringify(reviews));
    } catch (error) {
        isGlobalReviewMode = false;
        reviews = normalizeReviews(JSON.parse(localStorage.getItem("reviews")) || []);
        localStorage.setItem("reviews", JSON.stringify(reviews));
        if (reviewSummary) {
            reviewSummary.textContent = "Offline mode: showing local reviews only.";
        }
    }

    renderReviews();
}

function renderReviews() {
    if (!reviewList || !reviewSummary) {
        return;
    }

    reviewList.innerHTML = "";

    if (reviews.length === 0) {
        reviewSummary.textContent = isGlobalReviewMode
            ? "No reviews yet."
            : "Offline mode: no local reviews yet.";
        return;
    }

    const total = reviews.reduce((sum, item) => sum + item.rating, 0);
    const average = (total / reviews.length).toFixed(1);
    const modeLabel = isGlobalReviewMode ? "Global" : "Local";
    reviewSummary.textContent = `${modeLabel} Average Rating: ${average}/5 (${reviews.length} reviews)`;

    reviews.forEach((item) => {
        const listItem = document.createElement("li");
        listItem.className = "review-item";

        const body = document.createElement("p");
        body.textContent = `${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)} - ${item.text}`;

        const actions = document.createElement("div");
        actions.className = "review-actions";

        if (item.userId === userId) {
            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "review-edit-btn";
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => {
                activeReviewEditId = item.id;
                if (reviewText) {
                    reviewText.value = item.text;
                }

                setSelectedRating(item.rating);

                if (reviewSubmit) {
                    reviewSubmit.textContent = "Update Review";
                }

                if (cancelEditReviewBtn) {
                    cancelEditReviewBtn.hidden = false;
                }

                if (reviewText) {
                    reviewText.focus();
                }
            });

            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "review-delete-btn";
            deleteBtn.textContent = "Delete";
            deleteBtn.addEventListener("click", async () => {
                const confirmed = window.confirm("Delete this review?");
                if (!confirmed) {
                    return;
                }

                try {
                    setButtonLoading(deleteBtn, true, "Deleting...");
                    if (isGlobalReviewMode) {
                        reviews = await requestReviewsApi({ action: "delete", id: item.id, userId });
                        localStorage.setItem("reviews", JSON.stringify(reviews));
                    } else {
                        reviews = reviews.filter((reviewItem) => reviewItem.id !== item.id);
                        localStorage.setItem("reviews", JSON.stringify(reviews));
                    }

                    if (activeReviewEditId === item.id) {
                        resetReviewForm();
                    }

                    renderReviews();
                } catch (error) {
                    alert("Failed to delete review. Please try again.");
                } finally {
                    setButtonLoading(deleteBtn, false);
                }
            });

            actions.append(editBtn, deleteBtn);
        }
        listItem.append(body, actions);
        reviewList.appendChild(listItem);
    });
}

if (reviewStars.length > 0) {
    reviewStars.forEach((star) => {
        star.addEventListener("click", () => {
            setSelectedRating(Number(star.dataset.value));
        });
    });
}

if (cancelEditReviewBtn) {
    cancelEditReviewBtn.addEventListener("click", resetReviewForm);
}

if (reviewSubmit && reviewText) {
    reviewSubmit.addEventListener("click", async () => {
        const text = reviewText.value.trim();

        if (!selectedRating) {
            alert("Please select a star rating.");
            return;
        }

        if (!text) {
            alert("Please write a short review.");
            return;
        }

        try {
            setButtonLoading(reviewSubmit, true, activeReviewEditId ? "Updating..." : "Submitting...");
            if (isGlobalReviewMode) {
                reviews = await requestReviewsApi(
                    activeReviewEditId
                        ? { action: "update", id: activeReviewEditId, rating: selectedRating, text, userId }
                        : { action: "create", rating: selectedRating, text, userId }
                );
                localStorage.setItem("reviews", JSON.stringify(reviews));
            } else if (activeReviewEditId) {
                reviews = reviews.map((item) => (
                    item.id === activeReviewEditId
                        ? { ...item, rating: selectedRating, text }
                        : item
                ));
                localStorage.setItem("reviews", JSON.stringify(reviews));
            } else {
                reviews.unshift({
                    id: `local_${Date.now()}`,
                    userId,
                    rating: selectedRating,
                    text,
                    createdAt: Date.now()
                });
                localStorage.setItem("reviews", JSON.stringify(reviews));
            }

            resetReviewForm();
            renderReviews();
        } catch (error) {
            alert("Failed to save review. Please try again.");
        } finally {
            setButtonLoading(reviewSubmit, false);
        }
    });
}

loadReviews();

window.endCall = closeFakeCall;
window.deleteContact = removeContact;
