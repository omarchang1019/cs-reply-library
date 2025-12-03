let templatesData = { products: [] };

const productSelect = document.getElementById("productSelect");
const categorySelect = document.getElementById("categorySelect");
const subcategorySelect = document.getElementById("subcategorySelect");
const languageSelect = document.getElementById("languageSelect");
const replyText = document.getElementById("replyText");
const copyBtn = document.getElementById("copyBtn");
const importFileInput = document.getElementById("importFile");
const fileNameSpan = document.getElementById("fileName");
const charCountSpan = document.getElementById("charCount");

// 初始化：加载默认 templates.json
document.addEventListener("DOMContentLoaded", () => {
  fetch("data/templates.json")
    .then((res) => res.json())
    .then((data) => {
      templatesData = data;
      populateProducts();
    })
    .catch((err) => {
      console.error("Failed to load templates.json", err);
      alert("Failed to load templates.json. Please check the console.");
    });

  attachEventListeners();
});

function attachEventListeners() {
  productSelect.addEventListener("change", () => {
    populateCategories();
    clearSubcategories();
    clearReply();
  });

  categorySelect.addEventListener("change", () => {
    populateSubcategories();
    clearReply();
  });

  subcategorySelect.addEventListener("change", () => {
    showReply();
  });

  languageSelect.addEventListener("change", () => {
    showReply();
  });

  // ⭐ 在这里加入（放在最后更清晰）
  replyText.addEventListener("input", updateCharCount);
  importFileInput.addEventListener("change", handleImportFile);
}
  
  copyBtn.addEventListener("click", () => {
    if (!replyText.value) return;
    navigator.clipboard
      .writeText(replyText.value)
      .then(() => {
        alert("Reply copied to clipboard.");
      })
      .catch((err) => {
        console.error("Copy failed", err);
        alert("Failed to copy.");
      });
  });

  importFileInput.addEventListener("change", handleImportFile);
}

// 填充产品下拉
function populateProducts() {
  clearSelect(productSelect, "-- Select product --");
  templatesData.products.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.name;
    productSelect.appendChild(option);
  });
  categorySelect.disabled = true;
  subcategorySelect.disabled = true;
}

// 填充大类
function populateCategories() {
  const product = getSelectedProduct();
  clearSelect(categorySelect, "-- Select category --");
  clearSelect(subcategorySelect, "-- Select subcategory --");

  if (!product) {
    categorySelect.disabled = true;
    subcategorySelect.disabled = true;
    return;
  }

  (product.categories || []).forEach((c) => {
    const option = document.createElement("option");
    option.value = c.id;
    option.textContent = c.name;
    categorySelect.appendChild(option);
  });

  categorySelect.disabled = false;
  subcategorySelect.disabled = true;
}

// 填充子类
function populateSubcategories() {
  const category = getSelectedCategory();
  clearSelect(subcategorySelect, "-- Select subcategory --");

  if (!category) {
    subcategorySelect.disabled = true;
    return;
  }

  (category.subcategories || []).forEach((s) => {
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = s.name;
    subcategorySelect.appendChild(option);
  });

  subcategorySelect.disabled = false;
}

// 展示话术
function showReply() {
  const sub = getSelectedSubcategory();
  if (!sub) {
    replyText.value = "";
    updateCharCount(); 
    return;
  }

  const lang = languageSelect.value;

  let text = "";
  if (typeof sub.reply === "string") {
    text = sub.reply;
  } else if (typeof sub.reply === "object" && sub.reply !== null) {
    text = sub.reply[lang] || sub.reply["zh"] || sub.reply["en"] || "";
  }

  replyText.value = text;

  updateCharCount();
}

// 导入个人 JSON 文件并合并
function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) {
    if (fileNameSpan) fileNameSpan.textContent = "No file chosen";
    return;
  }

  fileNameSpan.textContent = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result);
      mergeTemplates(importedData);
      alert("Import successful!");
    } catch (err) {
      console.error("JSON parse error:", err);
      alert("Invalid JSON file. Please check the file format.");
    }
  };
  reader.readAsText(file);
}

// 合并逻辑：按 product/category/subcategory 的 id 来合并
function mergeTemplates(imported) {
  if (!imported || !Array.isArray(imported.products)) return;

  imported.products.forEach((impProduct) => {
    const existingProduct = templatesData.products.find(
      (p) => p.id === impProduct.id
    );
    if (!existingProduct) {
      // 完全新增产品
      templatesData.products.push(impProduct);
    } else {
      // 合并 categories
      mergeCategories(existingProduct, impProduct);
    }
  });
}

function mergeCategories(targetProduct, sourceProduct) {
  if (!Array.isArray(sourceProduct.categories)) return;

  sourceProduct.categories.forEach((impCat) => {
    const existingCat = (targetProduct.categories || []).find(
      (c) => c.id === impCat.id
    );
    if (!existingCat) {
      if (!Array.isArray(targetProduct.categories)) {
        targetProduct.categories = [];
      }
      targetProduct.categories.push(impCat);
    } else {
      mergeSubcategories(existingCat, impCat);
    }
  });
}

function mergeSubcategories(targetCat, sourceCat) {
  if (!Array.isArray(sourceCat.subcategories)) return;

  if (!Array.isArray(targetCat.subcategories)) {
    targetCat.subcategories = [];
  }

  sourceCat.subcategories.forEach((impSub) => {
    const existingSub = targetCat.subcategories.find(
      (s) => s.id === impSub.id
    );
    if (!existingSub) {
      targetCat.subcategories.push(impSub);
    } else {
      // 如果 id 相同，则用导入内容覆盖
      Object.assign(existingSub, impSub);
    }
  });
}

// 工具函数
function clearSelect(selectEl, placeholderText) {
  selectEl.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = placeholderText;
  selectEl.appendChild(opt);
}

function clearSubcategories() {
  clearSelect(subcategorySelect, "-- Select subcategory --");
  subcategorySelect.disabled = true;
}

function clearReply() {
  replyText.value = "";
  updateCharCount(); 
}

function getSelectedProduct() {
  const id = productSelect.value;
  if (!id) return null;
  return templatesData.products.find((p) => p.id === id) || null;
}

function getSelectedCategory() {
  const product = getSelectedProduct();
  if (!product) return null;
  const id = categorySelect.value;
  if (!id) return null;
  return (product.categories || []).find((c) => c.id === id) || null;
}

function getSelectedSubcategory() {
  const category = getSelectedCategory();
  if (!category) return null;
  const id = subcategorySelect.value;
  if (!id) return null;
  return (category.subcategories || []).find((s) => s.id === id) || null;
}
