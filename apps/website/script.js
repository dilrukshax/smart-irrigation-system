const MILESTONES = [
  {
    id: "proposal",
    name: "Project Proposal",
    date: "Week 6, Semester 1",
    type: "Individual document",
    detail:
      "Each member submits an individual proposal covering background, literature, research gap, problem, objectives, contribution, methodology, and timeline.",
  },
  {
    id: "pp1",
    name: "Progress Presentation 1",
    date: "Week 11, Semester 1",
    type: "Group presentation",
    detail:
      "Demonstrates roughly half of the system, including early ML models, service structure, core APIs, IoT data flow, and initial user interfaces.",
  },
  {
    id: "pp2",
    name: "Progress Presentation 2",
    date: "Week 6-8, Semester 2",
    type: "Group presentation",
    detail:
      "Shows near-complete integration across F1 to F4, role-based workflows, deployed services, and validated model behavior.",
  },
  {
    id: "final",
    name: "Final Assessment",
    date: "Week 12-13, Semester 2",
    type: "Group demonstration",
    detail:
      "Final system demonstration with documentation, deployment evidence, evaluation results, and defense of the integrated research contribution.",
  },
  {
    id: "viva",
    name: "Viva",
    date: "After final assessment",
    type: "Individual oral examination",
    detail:
      "Each member explains and defends their research contribution, implementation decisions, model choices, and integration results.",
  },
  {
    id: "research-paper",
    name: "Research Paper",
    date: "End of Semester 2",
    type: "Group submission",
    detail:
      "Publication-style paper that documents the integrated platform, methodology, evaluation, and comparison against existing work.",
  },
  {
    id: "logbook",
    name: "Logbook and Status Documents",
    date: "Continuous",
    type: "Continuous submission",
    detail:
      "Weekly progress records, supervisor feedback, blockers, and status documents for each research stream.",
  },
];

function initMenu() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("main-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("nav-open");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
    });
  });
}

function setActiveNav() {
  const page = document.body.dataset.page;
  if (!page) return;
  const link = document.querySelector(`[data-nav="${page}"]`);
  if (link) link.classList.add("active");
}

function renderMilestoneDetail(milestone) {
  const name = document.getElementById("selected-name");
  const date = document.getElementById("selected-date");
  const type = document.getElementById("selected-type");
  const detail = document.getElementById("selected-detail");

  if (!name || !date || !type || !detail) return;

  name.textContent = milestone.name;
  date.textContent = milestone.date;
  type.textContent = milestone.type;
  detail.textContent = milestone.detail;
}

function setTimelineActive(id) {
  document.querySelectorAll(".timeline-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.id === id);
  });
}

function initMilestones() {
  const select = document.getElementById("milestone-select");
  if (!select) return;

  function update(id) {
    const milestone = MILESTONES.find((item) => item.id === id) || MILESTONES[0];
    select.value = milestone.id;
    renderMilestoneDetail(milestone);
    setTimelineActive(milestone.id);
  }

  select.addEventListener("change", (event) => {
    update(event.target.value);
  });

  document.querySelectorAll(".timeline-item").forEach((button) => {
    button.addEventListener("click", () => {
      update(button.dataset.id);
    });
  });

  update(select.value || MILESTONES[0].id);
}

function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const config = window.SITE_MAIL_CONFIG || {};
    const recipient = config.recipient || "IT22561770@my.sliit.lk";
    const subjectPrefix = config.subjectPrefix || "[25-26J-520]";
    const subjectText = `${subjectPrefix} ${subject}`;
    const bodyText = [
      `From: ${name} <${email}>`,
      "",
      message,
      "",
      "Best regards,",
      name,
    ].join("\n");
    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
    const status = document.getElementById("contact-status");
    const gmailLink = document.getElementById("gmail-compose-link");
    const submitButton = form.querySelector('button[type="submit"]');

    if (gmailLink) {
      gmailLink.href = gmailUrl;
      gmailLink.hidden = false;
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(`To: ${recipient}\nSubject: ${subjectText}\n\n${bodyText}`).catch(() => {});
    }

    if (!config.endpoint) {
      if (status) {
        status.className = "form-status warning";
        status.textContent = "Mail service is not configured. Opening your email app instead.";
      }
      window.location.href = mailtoUrl;
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
    if (status) {
      status.className = "form-status";
      status.textContent = "Sending your message...";
    }

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          subject: subjectText,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mail service returned ${response.status}`);
      }

      form.reset();
      if (status) {
        status.className = "form-status success";
        status.textContent = "Message sent successfully. Thank you for contacting us.";
      }
    } catch (error) {
      if (status) {
        status.className = "form-status warning";
        status.textContent = "The mail service could not send the message. Use the Gmail button or your email app.";
      }
      console.error("Contact form submit failed", error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send Message";
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  setActiveNav();
  initMilestones();
  initContactForm();
});
