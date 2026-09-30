const dialog = document.querySelector("#visual-dialog");
const dialogImage = dialog.querySelector("img");
const dialogCaption = dialog.querySelector("p");
const dialogClose = dialog.querySelector(".dialog-close");

document.querySelectorAll(".visual-open").forEach((button) => {
  button.addEventListener("click", () => {
    dialogImage.src = button.dataset.image;
    dialogImage.alt = button.dataset.alt || "";
    dialogCaption.textContent = button.dataset.alt || "";
    dialog.showModal();
  });
});

function closeDialog() {
  dialog.close();
  dialogImage.src = "";
}

dialogClose.addEventListener("click", closeDialog);
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeDialog();
});
dialog.addEventListener("cancel", () => {
  dialogImage.src = "";
});
