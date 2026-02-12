document.addEventListener("DOMContentLoaded", () => {
  // Dark mode toggle functionality
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  
  if (darkModeToggle) {
    const darkModeIcon = darkModeToggle.querySelector(".icon");
    const darkModeText = darkModeToggle.querySelector(".text");

    // Check for saved theme preference or default to light mode
    const currentTheme = localStorage.getItem("theme") || "light";
    if (currentTheme === "dark") {
      document.body.classList.add("dark-mode");
      darkModeIcon.textContent = "☀️";
      darkModeText.textContent = "Light";
    }

    // Toggle dark mode
    darkModeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      
      if (document.body.classList.contains("dark-mode")) {
        darkModeIcon.textContent = "☀️";
        darkModeText.textContent = "Light";
        localStorage.setItem("theme", "dark");
      } else {
        darkModeIcon.textContent = "🌙";
        darkModeText.textContent = "Dark";
        localStorage.setItem("theme", "light");
      }
    });
  }

  // View toggle functionality (card view vs calendar view)
  const viewToggle = document.getElementById("view-toggle");
  let currentView = "card"; // Default to card view
  
  if (viewToggle) {
    const viewIcon = viewToggle.querySelector(".icon");
    const viewText = viewToggle.querySelector(".text");

    // Check for saved view preference or default to card view
    const savedView = localStorage.getItem("view") || "card";
    currentView = savedView;
    if (currentView === "calendar") {
      viewIcon.textContent = "🃏";
      viewText.textContent = "Cards";
    }

    // Toggle view mode
    viewToggle.addEventListener("click", () => {
      if (currentView === "card") {
        currentView = "calendar";
        viewIcon.textContent = "🃏";
        viewText.textContent = "Cards";
        localStorage.setItem("view", "calendar");
      } else {
        currentView = "card";
        viewIcon.textContent = "📅";
        viewText.textContent = "Calendar";
        localStorage.setItem("view", "card");
      }
      // Re-render activities with new view
      displayFilteredActivities();
    });
  }

  // DOM elements
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const registrationModal = document.getElementById("registration-modal");
  const modalActivityName = document.getElementById("modal-activity-name");
  const signupForm = document.getElementById("signup-form");
  const activityInput = document.getElementById("activity");
  const closeRegistrationModal = document.querySelector(".close-modal");

  // Search and filter elements
  const searchInput = document.getElementById("activity-search");
  const searchButton = document.getElementById("search-button");
  const categoryFilters = document.querySelectorAll(".category-filter");
  const dayFilters = document.querySelectorAll(".day-filter");
  const timeFilters = document.querySelectorAll(".time-filter");
  const difficultyFilters = document.querySelectorAll(".difficulty-filter");

  // Authentication elements
  const loginButton = document.getElementById("login-button");
  const userInfo = document.getElementById("user-info");
  const displayName = document.getElementById("display-name");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModal = document.querySelector(".close-login-modal");
  const loginMessage = document.getElementById("login-message");

  // School name constant
  const SCHOOL_NAME = "Mergington High School";

  // Activity categories with corresponding colors
  const activityTypes = {
    sports: { label: "Sports", color: "#e8f5e9", textColor: "#2e7d32" },
    arts: { label: "Arts", color: "#f3e5f5", textColor: "#7b1fa2" },
    academic: { label: "Academic", color: "#e3f2fd", textColor: "#1565c0" },
    community: { label: "Community", color: "#fff3e0", textColor: "#e65100" },
    technology: { label: "Technology", color: "#e8eaf6", textColor: "#3949ab" },
  };

  // State for activities and filters
  let allActivities = {};
  let currentFilter = "all";
  let searchQuery = "";
  let currentDay = "";
  let currentTimeRange = "";
  let currentDifficulty = "";

  // Authentication state
  let currentUser = null;

  // Time range mappings for the dropdown
  const timeRanges = {
    morning: { start: "06:00", end: "08:00" }, // Before school hours
    afternoon: { start: "15:00", end: "18:00" }, // After school hours
    weekend: { days: ["Saturday", "Sunday"] }, // Weekend days
  };

  // Initialize filters from active elements
  function initializeFilters() {
    // Initialize day filter
    const activeDayFilter = document.querySelector(".day-filter.active");
    if (activeDayFilter) {
      currentDay = activeDayFilter.dataset.day;
    }

    // Initialize time filter
    const activeTimeFilter = document.querySelector(".time-filter.active");
    if (activeTimeFilter) {
      currentTimeRange = activeTimeFilter.dataset.time;
    }

    // Initialize difficulty filter
    const activeDifficultyFilter = document.querySelector(".difficulty-filter.active");
    if (activeDifficultyFilter) {
      currentDifficulty = activeDifficultyFilter.dataset.difficulty;
    }
  }

  // Helper function to escape HTML for use in attributes
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Function to set day filter
  function setDayFilter(day) {
    currentDay = day;

    // Update active class
    dayFilters.forEach((btn) => {
      if (btn.dataset.day === day) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    fetchActivities();
  }

  // Function to set time range filter
  function setTimeRangeFilter(timeRange) {
    currentTimeRange = timeRange;

    // Update active class
    timeFilters.forEach((btn) => {
      if (btn.dataset.time === timeRange) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    fetchActivities();
  }

  // Function to set difficulty filter
  function setDifficultyFilter(difficulty) {
    currentDifficulty = difficulty;

    // Update active class
    difficultyFilters.forEach((btn) => {
      if (btn.dataset.difficulty === difficulty) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    displayFilteredActivities();
  }

  // Check if user is already logged in (from localStorage)
  function checkAuthentication() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
        // Verify the stored user with the server
        validateUserSession(currentUser.username);
      } catch (error) {
        console.error("Error parsing saved user", error);
        logout(); // Clear invalid data
      }
    }

    // Set authentication class on body
    updateAuthBodyClass();
  }

  // Validate user session with the server
  async function validateUserSession(username) {
    try {
      const response = await fetch(
        `/auth/check-session?username=${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        // Session invalid, log out
        logout();
        return;
      }

      // Session is valid, update user data
      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem("currentUser", JSON.stringify(userData));
      updateAuthUI();
    } catch (error) {
      console.error("Error validating session:", error);
    }
  }

  // Update UI based on authentication state
  function updateAuthUI() {
    if (currentUser) {
      loginButton.classList.add("hidden");
      userInfo.classList.remove("hidden");
      displayName.textContent = currentUser.display_name;
    } else {
      loginButton.classList.remove("hidden");
      userInfo.classList.add("hidden");
      displayName.textContent = "";
    }

    updateAuthBodyClass();
    // Refresh the activities to update the UI
    fetchActivities();
  }

  // Update body class for CSS targeting
  function updateAuthBodyClass() {
    if (currentUser) {
      document.body.classList.remove("not-authenticated");
    } else {
      document.body.classList.add("not-authenticated");
    }
  }

  // Login function
  async function login(username, password) {
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showLoginMessage(
          data.detail || "Invalid username or password",
          "error"
        );
        return false;
      }

      // Login successful
      currentUser = data;
      localStorage.setItem("currentUser", JSON.stringify(data));
      updateAuthUI();
      closeLoginModalHandler();
      showMessage(`Welcome, ${currentUser.display_name}!`, "success");
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      showLoginMessage("Login failed. Please try again.", "error");
      return false;
    }
  }

  // Logout function
  function logout() {
    currentUser = null;
    localStorage.removeItem("currentUser");
    updateAuthUI();
    showMessage("You have been logged out.", "info");
  }

  // Show message in login modal
  function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove("hidden");
  }

  // Open login modal
  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("show");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  }

  // Close login modal
  function closeLoginModalHandler() {
    loginModal.classList.remove("show");
    setTimeout(() => {
      loginModal.classList.add("hidden");
      loginForm.reset();
    }, 300);
  }

  // Event listeners for authentication
  loginButton.addEventListener("click", openLoginModal);
  logoutButton.addEventListener("click", logout);
  closeLoginModal.addEventListener("click", closeLoginModalHandler);

  // Close login modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModalHandler();
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await login(username, password);
  });

  // Show loading skeletons
  function showLoadingSkeletons() {
    activitiesList.innerHTML = "";

    // Create more skeleton cards to fill the screen since they're smaller now
    for (let i = 0; i < 9; i++) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "skeleton-card";
      skeletonCard.innerHTML = `
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div style="margin-top: 8px;">
          <div class="skeleton-line" style="height: 6px;"></div>
          <div class="skeleton-line skeleton-text short" style="height: 8px; margin-top: 3px;"></div>
        </div>
        <div style="margin-top: auto;">
          <div class="skeleton-line" style="height: 24px; margin-top: 8px;"></div>
        </div>
      `;
      activitiesList.appendChild(skeletonCard);
    }
  }

  // Format schedule for display - handles both old and new format
  function formatSchedule(details) {
    // If schedule_details is available, use the structured data
    if (details.schedule_details) {
      const days = details.schedule_details.days.join(", ");

      // Convert 24h time format to 12h AM/PM format for display
      const formatTime = (time24) => {
        const [hours, minutes] = time24.split(":").map((num) => parseInt(num));
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${displayHours}:${minutes
          .toString()
          .padStart(2, "0")} ${period}`;
      };

      const startTime = formatTime(details.schedule_details.start_time);
      const endTime = formatTime(details.schedule_details.end_time);

      return `${days}, ${startTime} - ${endTime}`;
    }

    // Fallback to the string format if schedule_details isn't available
    return details.schedule;
  }

  // Function to determine activity type (this would ideally come from backend)
  function getActivityType(activityName, description) {
    const name = activityName.toLowerCase();
    const desc = description.toLowerCase();

    if (
      name.includes("soccer") ||
      name.includes("basketball") ||
      name.includes("sport") ||
      name.includes("fitness") ||
      desc.includes("team") ||
      desc.includes("game") ||
      desc.includes("athletic")
    ) {
      return "sports";
    } else if (
      name.includes("art") ||
      name.includes("music") ||
      name.includes("theater") ||
      name.includes("drama") ||
      desc.includes("creative") ||
      desc.includes("paint")
    ) {
      return "arts";
    } else if (
      name.includes("science") ||
      name.includes("math") ||
      name.includes("academic") ||
      name.includes("study") ||
      name.includes("olympiad") ||
      desc.includes("learning") ||
      desc.includes("education") ||
      desc.includes("competition")
    ) {
      return "academic";
    } else if (
      name.includes("volunteer") ||
      name.includes("community") ||
      desc.includes("service") ||
      desc.includes("volunteer")
    ) {
      return "community";
    } else if (
      name.includes("computer") ||
      name.includes("coding") ||
      name.includes("tech") ||
      name.includes("robotics") ||
      desc.includes("programming") ||
      desc.includes("technology") ||
      desc.includes("digital") ||
      desc.includes("robot")
    ) {
      return "technology";
    }

    // Default to "academic" if no match
    return "academic";
  }

  // Function to fetch activities from API with optional day and time filters
  async function fetchActivities() {
    // Show loading skeletons first
    showLoadingSkeletons();

    try {
      // Build query string with filters if they exist
      let queryParams = [];

      // Handle day filter
      if (currentDay) {
        queryParams.push(`day=${encodeURIComponent(currentDay)}`);
      }

      // Handle time range filter
      if (currentTimeRange) {
        const range = timeRanges[currentTimeRange];

        // Handle weekend special case
        if (currentTimeRange === "weekend") {
          // Don't add time parameters for weekend filter
          // Weekend filtering will be handled on the client side
        } else if (range) {
          // Add time parameters for before/after school
          queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
          queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
        }
      }

      const queryString =
        queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const response = await fetch(`/activities${queryString}`);
      const activities = await response.json();

      // Save the activities data
      allActivities = activities;

      // Apply search and filter, and handle weekend filter in client
      displayFilteredActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to display filtered activities
  function displayFilteredActivities() {
    // Clear the activities list
    activitiesList.innerHTML = "";

    // Apply client-side filtering - this handles category filter and search, plus weekend filter
    let filteredActivities = {};

    Object.entries(allActivities).forEach(([name, details]) => {
      const activityType = getActivityType(name, details.description);

      // Apply category filter
      if (currentFilter !== "all" && activityType !== currentFilter) {
        return;
      }

      // Apply weekend filter if selected
      if (currentTimeRange === "weekend" && details.schedule_details) {
        const activityDays = details.schedule_details.days;
        const isWeekendActivity = activityDays.some((day) =>
          timeRanges.weekend.days.includes(day)
        );

        if (!isWeekendActivity) {
          return;
        }
      }

      // Apply difficulty filter
      // "All Levels" (empty string) should only show activities with no difficulty specified
      if (currentDifficulty === "") {
        // Show only activities without a difficulty field
        if (details.difficulty) {
          return;
        }
      } else {
        // Show only activities matching the selected difficulty
        if (details.difficulty !== currentDifficulty) {
          return;
        }
      }

      // Apply search filter
      const searchableContent = [
        name.toLowerCase(),
        details.description.toLowerCase(),
        formatSchedule(details).toLowerCase(),
      ].join(" ");

      if (
        searchQuery &&
        !searchableContent.includes(searchQuery.toLowerCase())
      ) {
        return;
      }

      // Activity passed all filters, add to filtered list
      filteredActivities[name] = details;
    });

    // Check if there are any results
    if (Object.keys(filteredActivities).length === 0) {
      if (currentView === "calendar") {
        activitiesList.innerHTML = `
          <div class="calendar-empty">
            <h4>No activities found</h4>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        `;
      } else {
        activitiesList.innerHTML = `
          <div class="no-results">
            <h4>No activities found</h4>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        `;
      }
      return;
    }

    // Display filtered activities based on current view
    if (currentView === "calendar") {
      renderCalendarView(filteredActivities);
    } else {
      Object.entries(filteredActivities).forEach(([name, details]) => {
        renderActivityCard(name, details);
      });
    }
  }

  // Function to render calendar view
  function renderCalendarView(activities) {
    // Days of the week (Sunday to Saturday)
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    // Time slots (6 AM to 8 PM in 1-hour increments)
    const timeSlots = [];
    for (let hour = 6; hour <= 20; hour++) {
      const hourStr = hour.toString().padStart(2, "0");
      timeSlots.push(`${hourStr}:00`);
    }
    
    // Create calendar structure
    const calendarHTML = `
      <div id="calendar-view">
        <div class="calendar-container">
          <div class="calendar-header">
            <div class="calendar-header-cell time-column">Time</div>
            ${daysOfWeek.map(day => `<div class="calendar-header-cell">${day}</div>`).join("")}
          </div>
          <div class="calendar-body">
            ${timeSlots.map(timeSlot => {
              const hour = parseInt(timeSlot.split(":")[0]);
              const nextHour = (hour + 1).toString().padStart(2, "0");
              const timeLabel = formatTimeRange(timeSlot, `${nextHour}:00`);
              
              return `
                <div class="time-slot">${timeLabel}</div>
                ${daysOfWeek.map(day => {
                  const cellActivities = getActivitiesForDayAndTime(activities, day, timeSlot, `${nextHour}:00`);
                  const hasMultiple = cellActivities.length > 1;
                  
                  return `
                    <div class="calendar-cell ${hasMultiple ? 'has-multiple-events' : ''}" data-day="${day}" data-time="${timeSlot}">
                      <div class="calendar-cell-content">
                        ${cellActivities.map(activity => {
                          const enrollment = `${activity.details.participants.length}/${activity.details.max_participants}`;
                          return `
                            <div class="calendar-event" 
                                 data-activity-name="${escapeHtml(activity.name)}"
                                 onmouseenter="showEventTooltip(event, this)"
                                 onmouseleave="hideEventTooltip()">
                              <div class="calendar-event-title">${escapeHtml(activity.name)}</div>
                              <div class="calendar-event-enrollment">${enrollment}</div>
                            </div>
                          `;
                        }).join("")}
                      </div>
                    </div>
                  `;
                }).join("")}
              `;
            }).join("")}
          </div>
        </div>
        <div class="calendar-event-tooltip" id="event-tooltip"></div>
      </div>
    `;
    
    activitiesList.innerHTML = calendarHTML;
  }
  
  // Helper function to get activities for a specific day and time slot
  function getActivitiesForDayAndTime(activities, day, startTime, endTime) {
    const result = [];
    
    Object.entries(activities).forEach(([name, details]) => {
      if (!details.schedule_details) return;
      
      const { days, start_time, end_time: activity_end_time } = details.schedule_details;
      
      // Check if activity occurs on this day
      if (!days.includes(day)) return;
      
      // Check if activity overlaps with this time slot
      // Convert times to minutes for easier comparison
      const slotStart = timeToMinutes(startTime);
      const slotEnd = timeToMinutes(endTime);
      const activityStart = timeToMinutes(start_time);
      const activityEnd = timeToMinutes(activity_end_time);
      
      // Check for overlap: activity starts before slot ends AND activity ends after slot starts
      if (activityStart < slotEnd && activityEnd > slotStart) {
        result.push({ name, details });
      }
    });
    
    return result;
  }
  
  // Helper function to convert time string (HH:MM) to minutes
  function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }
  
  // Helper function to format time range for display
  function formatTimeRange(startTime, endTime) {
    const formatTime = (time) => {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}${ampm}`;
    };
    
    return `${formatTime(startTime)}`;
  }
  
  // Global functions for event tooltips (need to be accessible from inline handlers)
  window.showEventTooltip = function(event, element) {
    const tooltip = document.getElementById("event-tooltip");
    if (!tooltip) return;
    
    const activityName = element.getAttribute("data-activity-name");
    const activity = allActivities[activityName];
    
    if (!activity) return;
    
    const enrollment = `${activity.participants.length}/${activity.max_participants}`;
    const schedule = formatSchedule(activity);
    
    tooltip.innerHTML = `
      <div class="calendar-event-tooltip-title">${escapeHtml(activityName)}</div>
      <div class="calendar-event-tooltip-detail"><strong>Schedule:</strong> ${schedule}</div>
      <div class="calendar-event-tooltip-detail"><strong>Enrollment:</strong> ${enrollment}</div>
      <div class="calendar-event-tooltip-detail"><strong>Description:</strong> ${escapeHtml(activity.description)}</div>
    `;
    
    // Position tooltip near the mouse
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY - 10}px`;
    tooltip.classList.add("show");
  };
  
  window.hideEventTooltip = function() {
    const tooltip = document.getElementById("event-tooltip");
    if (tooltip) {
      tooltip.classList.remove("show");
    }
  };

  // Function to render a single activity card
  function renderActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    // Calculate spots and capacity
    const totalSpots = details.max_participants;
    const takenSpots = details.participants.length;
    const spotsLeft = totalSpots - takenSpots;
    const capacityPercentage = (takenSpots / totalSpots) * 100;
    const isFull = spotsLeft <= 0;

    // Determine capacity status class
    let capacityStatusClass = "capacity-available";
    if (isFull) {
      capacityStatusClass = "capacity-full";
    } else if (capacityPercentage >= 75) {
      capacityStatusClass = "capacity-near-full";
    }

    // Determine activity type
    const activityType = getActivityType(name, details.description);
    const typeInfo = activityTypes[activityType];

    // Format the schedule using the new helper function
    const formattedSchedule = formatSchedule(details);

    // Create activity tag
    const tagHtml = `
      <span class="activity-tag" style="background-color: ${typeInfo.color}; color: ${typeInfo.textColor}">
        ${typeInfo.label}
      </span>
    `;

    // Create capacity indicator
    const capacityIndicator = `
      <div class="capacity-container ${capacityStatusClass}">
        <div class="capacity-bar-bg">
          <div class="capacity-bar-fill" style="width: ${capacityPercentage}%"></div>
        </div>
        <div class="capacity-text">
          <span>${takenSpots} enrolled</span>
          <span>${spotsLeft} spots left</span>
        </div>
      </div>
    `;

    activityCard.innerHTML = `
      ${tagHtml}
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p class="tooltip">
        <strong>Schedule:</strong> ${formattedSchedule}
        <span class="tooltip-text">Regular meetings at this time throughout the semester</span>
      </p>
      ${capacityIndicator}
      <div class="participants-list">
        <h5>Current Participants:</h5>
        <ul>
          ${details.participants
            .map(
              (email) => `
            <li>
              ${email}
              ${
                currentUser
                  ? `
                <span class="delete-participant tooltip" data-activity="${name}" data-email="${email}">
                  ✖
                  <span class="tooltip-text">Unregister this student</span>
                </span>
              `
                  : ""
              }
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
      <div class="social-sharing">
        <span class="share-label">Share:</span>
        <button class="share-button share-twitter" data-activity="${escapeHtml(name)}" data-description="${escapeHtml(details.description)}" data-schedule="${escapeHtml(formattedSchedule)}" title="Share on Twitter">
          <span class="share-icon">🐦</span>
        </button>
        <button class="share-button share-facebook" data-activity="${escapeHtml(name)}" data-description="${escapeHtml(details.description)}" data-schedule="${escapeHtml(formattedSchedule)}" title="Share on Facebook">
          <span class="share-icon">📘</span>
        </button>
        <button class="share-button share-email" data-activity="${escapeHtml(name)}" data-description="${escapeHtml(details.description)}" data-schedule="${escapeHtml(formattedSchedule)}" title="Share via Email">
          <span class="share-icon">📧</span>
        </button>
        <button class="share-button share-copy" data-activity="${escapeHtml(name)}" data-description="${escapeHtml(details.description)}" data-schedule="${escapeHtml(formattedSchedule)}" title="Copy Link">
          <span class="share-icon">🔗</span>
        </button>
      </div>
      <div class="activity-card-actions">
        ${
          currentUser
            ? `
          <button class="register-button" data-activity="${name}" ${
                isFull ? "disabled" : ""
              }>
            ${isFull ? "Activity Full" : "Register Student"}
          </button>
        `
            : `
          <div class="auth-notice">
            Teachers can register students.
          </div>
        `
        }
      </div>
    `;

    // Add click handlers for delete buttons
    const deleteButtons = activityCard.querySelectorAll(".delete-participant");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    // Add click handlers for sharing buttons
    const shareButtons = activityCard.querySelectorAll(".share-button");
    shareButtons.forEach((button) => {
      button.addEventListener("click", handleShare);
    });

    // Add click handler for register button (only when authenticated)
    if (currentUser) {
      const registerButton = activityCard.querySelector(".register-button");
      if (!isFull) {
        registerButton.addEventListener("click", () => {
          openRegistrationModal(name);
        });
      }
    }

    activitiesList.appendChild(activityCard);
  }

  // Event listeners for search and filter
  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    displayFilteredActivities();
  });

  searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    searchQuery = searchInput.value;
    displayFilteredActivities();
  });

  // Add event listeners to category filter buttons
  categoryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active class
      categoryFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Update current filter and display filtered activities
      currentFilter = button.dataset.category;
      displayFilteredActivities();
    });
  });

  // Add event listeners to day filter buttons
  dayFilters.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active class
      dayFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Update current day filter and fetch activities
      currentDay = button.dataset.day;
      fetchActivities();
    });
  });

  // Add event listeners for time filter buttons
  timeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active class
      timeFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Update current time filter and fetch activities
      currentTimeRange = button.dataset.time;
      fetchActivities();
    });
  });

  // Add event listeners for difficulty filter buttons
  difficultyFilters.forEach((button) => {
    button.addEventListener("click", () => {
      setDifficultyFilter(button.dataset.difficulty);
    });
  });

  // Open registration modal
  function openRegistrationModal(activityName) {
    modalActivityName.textContent = activityName;
    activityInput.value = activityName;
    registrationModal.classList.remove("hidden");
    // Add slight delay to trigger animation
    setTimeout(() => {
      registrationModal.classList.add("show");
    }, 10);
  }

  // Close registration modal
  function closeRegistrationModalHandler() {
    registrationModal.classList.remove("show");
    setTimeout(() => {
      registrationModal.classList.add("hidden");
      signupForm.reset();
    }, 300);
  }

  // Event listener for close button
  closeRegistrationModal.addEventListener(
    "click",
    closeRegistrationModalHandler
  );

  // Close modal when clicking outside of it
  window.addEventListener("click", (event) => {
    if (event.target === registrationModal) {
      closeRegistrationModalHandler();
    }
  });

  // Create and show confirmation dialog
  function showConfirmationDialog(message, confirmCallback) {
    // Create the confirmation dialog if it doesn't exist
    let confirmDialog = document.getElementById("confirm-dialog");
    if (!confirmDialog) {
      confirmDialog = document.createElement("div");
      confirmDialog.id = "confirm-dialog";
      confirmDialog.className = "modal hidden";
      confirmDialog.innerHTML = `
        <div class="modal-content">
          <h3>Confirm Action</h3>
          <p id="confirm-message"></p>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button id="cancel-button" class="cancel-btn">Cancel</button>
            <button id="confirm-button" class="confirm-btn">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);

      // Style the buttons
      const cancelBtn = confirmDialog.querySelector("#cancel-button");
      const confirmBtn = confirmDialog.querySelector("#confirm-button");

      cancelBtn.style.backgroundColor = "#f1f1f1";
      cancelBtn.style.color = "#333";

      confirmBtn.style.backgroundColor = "#dc3545";
      confirmBtn.style.color = "white";
    }

    // Set the message
    const confirmMessage = document.getElementById("confirm-message");
    confirmMessage.textContent = message;

    // Show the dialog
    confirmDialog.classList.remove("hidden");
    setTimeout(() => {
      confirmDialog.classList.add("show");
    }, 10);

    // Handle button clicks
    const cancelButton = document.getElementById("cancel-button");
    const confirmButton = document.getElementById("confirm-button");

    // Remove any existing event listeners
    const newCancelButton = cancelButton.cloneNode(true);
    const newConfirmButton = confirmButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    // Add new event listeners
    newCancelButton.addEventListener("click", () => {
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    newConfirmButton.addEventListener("click", () => {
      confirmCallback();
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    // Close when clicking outside
    confirmDialog.addEventListener("click", (event) => {
      if (event.target === confirmDialog) {
        confirmDialog.classList.remove("show");
        setTimeout(() => {
          confirmDialog.classList.add("hidden");
        }, 300);
      }
    });
  }

  // Handle unregistration with confirmation
  async function handleUnregister(event) {
    // Check if user is authenticated
    if (!currentUser) {
      showMessage(
        "You must be logged in as a teacher to unregister students.",
        "error"
      );
      return;
    }

    const activity = event.target.dataset.activity;
    const email = event.target.dataset.email;

    // Show confirmation dialog
    showConfirmationDialog(
      `Are you sure you want to unregister ${email} from ${activity}?`,
      async () => {
        try {
          const response = await fetch(
            `/activities/${encodeURIComponent(
              activity
            )}/unregister?email=${encodeURIComponent(
              email
            )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
            {
              method: "POST",
            }
          );

          const result = await response.json();

          if (response.ok) {
            showMessage(result.message, "success");
            // Refresh the activities list
            fetchActivities();
          } else {
            showMessage(result.detail || "An error occurred", "error");
          }
        } catch (error) {
          showMessage("Failed to unregister. Please try again.", "error");
          console.error("Error unregistering:", error);
        }
      }
    );
  }

  // Handle social sharing
  function handleShare(event) {
    const button = event.currentTarget;
    const activityName = button.dataset.activity;
    const description = button.dataset.description;
    const schedule = button.dataset.schedule;
    
    // Create the share text
    const shareText = `Check out ${activityName} at ${SCHOOL_NAME}! ${description} Schedule: ${schedule}`;
    const shareUrl = window.location.href;
    
    // Determine which share button was clicked
    if (button.classList.contains('share-twitter')) {
      // Twitter share
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(twitterUrl, '_blank', 'width=550,height=420');
    } else if (button.classList.contains('share-facebook')) {
      // Facebook share
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
      window.open(facebookUrl, '_blank', 'width=550,height=420');
    } else if (button.classList.contains('share-email')) {
      // Email share
      const subject = `Check out ${activityName}`;
      const body = `${shareText}\n\nView more activities: ${shareUrl}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else if (button.classList.contains('share-copy')) {
      // Copy link to clipboard with fallback
      const textToCopy = `${shareText}\n${shareUrl}`;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          // Show success message
          const originalIcon = button.querySelector('.share-icon').textContent;
          button.querySelector('.share-icon').textContent = '✓';
          button.style.backgroundColor = 'var(--success)';
          
          setTimeout(() => {
            button.querySelector('.share-icon').textContent = originalIcon;
            button.style.backgroundColor = '';
          }, 2000);
          
          showMessage('Link copied to clipboard!', 'success');
        }).catch(err => {
          console.error('Failed to copy:', err);
          showMessage('Failed to copy link. Please try again.', 'error');
        });
      } else {
        // Fallback for browsers without clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
          document.execCommand('copy');
          const originalIcon = button.querySelector('.share-icon').textContent;
          button.querySelector('.share-icon').textContent = '✓';
          button.style.backgroundColor = 'var(--success)';
          
          setTimeout(() => {
            button.querySelector('.share-icon').textContent = originalIcon;
            button.style.backgroundColor = '';
          }, 2000);
          
          showMessage('Link copied to clipboard!', 'success');
        } catch (err) {
          console.error('Fallback copy failed:', err);
          showMessage('Failed to copy link. Please try again.', 'error');
        } finally {
          document.body.removeChild(textarea);
        }
      }
    }
  }

  // Show message function
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    // Hide message after 5 seconds
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Check if user is authenticated
    if (!currentUser) {
      showMessage(
        "You must be logged in as a teacher to register students.",
        "error"
      );
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activityInput.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(
          email
        )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        closeRegistrationModalHandler();
        // Refresh the activities list after successful signup
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Expose filter functions to window for future UI control
  window.activityFilters = {
    setDayFilter,
    setTimeRangeFilter,
  };

  // Initialize app
  checkAuthentication();
  initializeFilters();
  fetchActivities();
});
