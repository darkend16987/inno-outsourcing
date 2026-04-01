(function () {
  const root = document.documentElement;
  const storageKey = "inno-jobs-wireframe-theme";
  const storedTheme = localStorage.getItem(storageKey);

  if (storedTheme === "dark" || storedTheme === "light") {
    root.dataset.theme = storedTheme;
  } else {
    root.dataset.theme = "light";
  }

  const scriptEl =
    document.currentScript ||
    Array.from(document.scripts).find(function (script) {
      return /assets\/app\.js(?:\?|$)/.test(script.src);
    });

  const rootUrl = scriptEl ? new URL("../", scriptEl.src) : new URL("./", window.location.href);
  const currentHref = window.location.href.split("#")[0];

  const roleGroups = [
    {
      label: "Public",
      items: [
        { code: "C1", title: "Trang chủ", path: "index.html" },
        { code: "C2", title: "Danh sách công việc", path: "jobs/index.html" },
        { code: "C3", title: "Chi tiết công việc", path: "jobs/job-detail.html" },
        { code: "C5", title: "Đăng ký", path: "register/index.html" },
        { code: "C6", title: "Đăng nhập", path: "login/index.html" },
        { code: "C22", title: "Bảng vinh danh", path: "leaderboard/index.html" },
        { code: "C23", title: "Hệ thống huy hiệu", path: "badges/index.html" }
      ]
    },
    {
      label: "Worker",
      items: [
        { code: "C3b", title: "Đơn ứng tuyển (Apply)", path: "jobs/apply.html" },
        { code: "C7", title: "Dashboard Worker", path: "dashboard/index.html" },
        { code: "C8", title: "Hồ sơ năng lực", path: "profile/index.html" },
        { code: "C9", title: "Việc của tôi", path: "my-jobs/index.html" },
        { code: "C10", title: "Chi tiết việc đang làm", path: "my-jobs/detail.html" },
        { code: "C11", title: "Hợp đồng Worker", path: "my-contracts/index.html" }
      ]
    },
    {
      label: "Admin",
      items: [
        { code: "C12", title: "Dashboard Admin", path: "admin/index.html" },
        { code: "C13", title: "Tạo hoặc sửa job", path: "admin/jobs/new.html" },
        { code: "C14", title: "Job chờ duyệt", path: "admin/jobs/pending.html" },
        { code: "C4", title: "Chi tiết duyệt job", path: "admin/jobs/review.html" },
        { code: "C15", title: "Quản lý ứng tuyển", path: "admin/jobs/applications.html" },
        { code: "C16", title: "Hợp đồng Admin", path: "admin/contracts/index.html" },
        { code: "C17", title: "Theo dõi tiến độ", path: "admin/progress/index.html" },
        { code: "C18", title: "Quản lý người dùng", path: "admin/users/index.html" },
        { code: "C19", title: "Báo cáo", path: "admin/reports/index.html" }
      ]
    },
    {
      label: "Kế toán",
      items: [
        { code: "C20", title: "Dashboard kế toán", path: "accounting/index.html" },
        { code: "C21", title: "Lịch sử thanh toán", path: "accounting/history.html" }
      ]
    },
    {
      label: "Shared Components",
      items: [
        { code: "C24", title: "Comment component", path: "components/comments.html" },
        { code: "C25", title: "Hệ thống thông báo", path: "components/notifications.html" },
        { code: "C26", title: "Tạo hợp đồng (wizard)", path: "components/contract-wizard.html" }
      ]
    }
  ];

  function toHref(path) {
    return new URL(path, rootUrl).href;
  }

  function isCurrent(path) {
    return toHref(path).split("#")[0] === currentHref;
  }

  function updateThemeButtons() {
    const nextLabel = root.dataset.theme === "dark" ? "Chế độ sáng" : "Chế độ tối";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.textContent = nextLabel;
    });
  }

  function renderRoleGroup(group) {
    return (
      '<section class="role-sidebar-section">' +
      '<div class="role-sidebar-label">' +
      group.label +
      "</div>" +
      group.items
        .map(function (item) {
          return (
            '<a class="role-sidebar-link' +
            (isCurrent(item.path) ? " active" : "") +
            '" href="' +
            toHref(item.path) +
            '">' +
            '<span class="role-sidebar-code">' +
            item.code +
            "</span>" +
            '<span class="role-sidebar-text">' +
            item.title +
            "</span>" +
            "</a>"
          );
        })
        .join("") +
      "</section>"
    );
  }

  function buildRoleSidebar() {
    if (!document.body || document.querySelector(".role-sidebar")) {
      return;
    }

    document.body.classList.add("has-role-sidebar");

    const sidebar = document.createElement("aside");
    sidebar.className = "role-sidebar";
    sidebar.innerHTML =
      '<div class="role-sidebar-header">' +
      '<a class="role-sidebar-brand" href="' +
      toHref("index.html") +
      '">INNO Jobs</a>' +
      '<span class="role-sidebar-note">Điều hướng nhanh theo vai trò</span>' +
      "</div>" +
      '<div class="role-sidebar-groups">' +
      roleGroups.map(renderRoleGroup).join("") +
      "</div>";

    document.body.insertBefore(sidebar, document.body.firstChild);
  }

  document.addEventListener("click", function (event) {
    const toggle = event.target.closest("[data-theme-toggle]");
    if (!toggle) {
      return;
    }

    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = nextTheme;
    localStorage.setItem(storageKey, nextTheme);
    updateThemeButtons();
  });

  function init() {
    buildRoleSidebar();
    updateThemeButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
