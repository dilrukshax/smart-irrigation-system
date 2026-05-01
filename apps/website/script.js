const MILESTONES = [
  {
    id: "proposal",
    name: "Project Proposal",
    date: "Week 6, Semester 1",
    marks: "6%",
    type: "Individual document",
    detail:
      "Each member submits an individual proposal covering background, literature, research gap, problem, objectives, contribution, methodology, and timeline.",
  },
  {
    id: "pp1",
    name: "Progress Presentation 1",
    date: "Week 11, Semester 1",
    marks: "15%",
    type: "Group presentation",
    detail:
      "Demonstrates roughly half of the system, including early ML models, service structure, core APIs, IoT data flow, and initial user interfaces.",
  },
  {
    id: "pp2",
    name: "Progress Presentation 2",
    date: "Week 6-8, Semester 2",
    marks: "18%",
    type: "Group presentation",
    detail:
      "Shows near-complete integration across F1 to F4, role-based workflows, deployed services, and validated model behavior.",
  },
  {
    id: "final",
    name: "Final Assessment",
    date: "Week 12-13, Semester 2",
    marks: "19%",
    type: "Group demonstration",
    detail:
      "Final system demonstration with documentation, deployment evidence, evaluation results, and defense of the integrated research contribution.",
  },
  {
    id: "viva",
    name: "Viva",
    date: "After final assessment",
    marks: "10%",
    type: "Individual oral examination",
    detail:
      "Each member explains and defends their research contribution, implementation decisions, model choices, and integration results.",
  },
  {
    id: "research-paper",
    name: "Research Paper",
    date: "End of Semester 2",
    marks: "10%",
    type: "Group submission",
    detail:
      "Publication-style paper that documents the integrated platform, methodology, evaluation, and comparison against existing work.",
  },
  {
    id: "logbook",
    name: "Logbook and Status Documents",
    date: "Continuous",
    marks: "12%",
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
  const marks = document.getElementById("selected-marks");
  const type = document.getElementById("selected-type");
  const detail = document.getElementById("selected-detail");

  if (!name || !date || !marks || !type || !detail) return;

  name.textContent = milestone.name;
  date.textContent = milestone.date;
  marks.textContent = milestone.marks;
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("name");
    const email = document.getElementById("email");
    const subject = document.getElementById("subject");
    const message = document.getElementById("message");

    const recipient = "IT22561770@my.sliit.lk";
    const subjectText = encodeURIComponent(`[25-26J-520] ${subject.value}`);
    const bodyText = encodeURIComponent(`From: ${name.value} <${email.value}>\n\n${message.value}`);

    window.location.href = `mailto:${recipient}?subject=${subjectText}&body=${bodyText}`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  setActiveNav();
  initMilestones();
  initContactForm();
});
