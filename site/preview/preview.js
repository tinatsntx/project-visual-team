/* global document, location, URLSearchParams */
const sampleParams = new URLSearchParams(location.search);
const selectedFixture = sampleParams.get("fixture") || "team-with-permission";
if (sampleParams.get("embed") === "1") document.body.classList.add("embedded");
for (const link of document.querySelectorAll("[data-fixture]")) {
  if (link.dataset.fixture === selectedFixture) link.setAttribute("aria-current", "page");
}
