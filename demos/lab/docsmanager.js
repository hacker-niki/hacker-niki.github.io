'use strict';

const docMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const docNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const xmlNamespace = 'http://www.w3.org/XML/1998/namespace';
const docPart = 'word/document.xml';
const maxFile = 20 * 1024 * 1024;
const maxTextPart = 4 * 1024 * 1024;
const sampleDefaults = ['Лаборатория звука', 'Интерактивный прототип', 'Демонстрация'];
const docFields = document.querySelector('#dm-fields');
const docPreview = document.querySelector('#dm-content');
const docSave = document.querySelector('#dm-save');
const docMessage = document.querySelector('#dm-message');
const docInput = document.querySelector('#dm-file');
let template = null;
let revision = 0;

function message(text = '', error = false) {
  docMessage.dataset.error = String(error);
  docMessage.textContent = text;
}

async function makeExample() {
  const archive = new JSZip();
  archive.file(
    '[Content_Types].xml',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  archive.file(
    '_rels/.rels',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  const lines = [
    'Карточка проекта',
    'Проект: %%Название%%',
    'Результат: %%Результат%%',
    'Текущий этап: %%Этап%%',
  ];
  const paragraphs = lines.map(
    (line, i) =>
      '<w:p><w:r>' +
      (i === 0 ? '<w:rPr><w:b/><w:sz w:val="38"/></w:rPr>' : '') +
      '<w:t>' +
      line +
      '</w:t></w:r></w:p>',
  );
  archive.file(
    docPart,
    '<w:document xmlns:w="' +
      docNamespace +
      '"><w:body>' +
      paragraphs.join('') +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>',
  );
  return archive.generateAsync({ type: 'uint8array' });
}

function wElements(node, name) {
  return Array.from(node.getElementsByTagNameNS(docNamespace, name));
}

function readDocumentXml(part) {
  return new Promise((resolve, reject) => {
    const stream = part.internalStream('uint8array');
    const decoder = new TextDecoder();
    let length = 0;
    let xml = '';
    stream.on('data', (chunk) => {
      length += chunk.length;
      if (length > maxTextPart) {
        stream.pause();
        reject(new Error('Основной текст документа превышает 4 МиБ.'));
        return;
      }
      xml += decoder.decode(chunk, { stream: true });
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(xml + decoder.decode()));
    stream.resume();
  });
}

function parseTemplate(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Такой вариант XML не поддерживается.');
  const dom = new DOMParser().parseFromString(xml, 'application/xml');
  if (
    dom.getElementsByTagName('parsererror').length ||
    dom.documentElement.localName !== 'document' ||
    dom.documentElement.namespaceURI !== docNamespace
  )
    throw new Error('Не удалось прочитать основной текст Word.');
  const fields = [];
  const paragraphs = [];
  for (const paragraph of wElements(dom, 'p')) {
    // Word can split a single marker across several runs when formatting changes.
    const nodes = wElements(paragraph, 't').filter((node) => {
      let parent = node.parentNode;
      while (parent && !(parent.namespaceURI === docNamespace && parent.localName === 'p'))
        parent = parent.parentNode;
      return parent === paragraph;
    });
    let text = '';
    const spans = nodes.map((node) => {
      const start = text.length;
      text += node.textContent;
      return { node, start, end: text.length };
    });
    const matches = [];
    for (const match of text.matchAll(/%%([^%\r\n]+?)%%/gu)) {
      if (new TextEncoder().encode(match[1]).length > 256) throw new Error('Имя поля длиннее 256 байт.');
      const field = {
        name: match[1],
        start: match.index,
        end: match.index + match[0].length,
        index: fields.length,
      };
      fields.push(field);
      matches.push(field);
      if (fields.length > 512) throw new Error('Демо поддерживает до 512 полей в одном шаблоне.');
    }
    if (text.trim()) paragraphs.push({ text, spans, matches });
  }
  return { dom, paragraphs, fields };
}

function renderPreview() {
  if (!template) return;
  const values = template.inputs.map((input) => input.value);
  const fragment = document.createDocumentFragment();
  for (const paragraph of template.paragraphs.slice(0, 24)) {
    const p = document.createElement('p');
    let at = 0;
    for (const match of paragraph.matches) {
      p.append(paragraph.text.slice(at, match.start));
      const mark = document.createElement('mark');
      mark.textContent = values[match.index] || paragraph.text.slice(match.start, match.end);
      p.append(mark);
      at = match.end;
    }
    p.append(paragraph.text.slice(at));
    fragment.append(p);
  }
  if (template.paragraphs.length > 24) {
    const rest = document.createElement('p');
    rest.textContent = 'Показаны первые 24 абзаца.';
    fragment.append(rest);
  }
  docPreview.replaceChildren(fragment);
  docSave.disabled = !values.length || values.some((value) => !value.trim());
}

async function openTemplate(file, example = false) {
  const request = ++revision;
  message('Открываем шаблон…');
  docSave.disabled = true;
  try {
    if (!example && file.size > maxFile) throw new Error('Выбери DOCX размером до 20 МиБ.');
    const bytes = example ? await makeExample() : await file.arrayBuffer();
    const archive = await JSZip.loadAsync(bytes);
    const items = Object.values(archive.files);
    const total = items.reduce((sum, part) => sum + (part._data?.uncompressedSize || 0), 0);
    const part = archive.file(docPart);
    if (!part || !archive.file('[Content_Types].xml')) throw new Error('В архиве не найден документ DOCX.');
    if (items.length > 2048 || total > 96 * 1024 * 1024 || part._data.uncompressedSize > maxTextPart) {
      throw new Error('Этот документ слишком велик для браузерного демо.');
    }
    const xml = await readDocumentXml(part);
    const parsed = parseTemplate(xml);
    if (request !== revision) return;
    const inputs = parsed.fields.map((field) => {
      const input = document.createElement('input');
      input.value = example ? sampleDefaults[field.index] : '';
      input.maxLength = 4096;
      input.required = true;
      return input;
    });
    template = {
      bytes,
      xml,
      paragraphs: parsed.paragraphs,
      inputs,
      name: example ? 'Карточка проекта.docx' : file.name,
    };
    const labels = parsed.fields.map((field, index) => {
      const label = document.createElement('label');
      label.className = 'dm-field';
      label.append(field.name, inputs[index]);
      return label;
    });
    docFields.replaceChildren(...labels);
    document.querySelector('#dm-name').textContent = template.name;
    message(
      parsed.fields.length
        ? ''
        : 'В основном тексте не нашлось полей. Добавь в документ, например, %%Название%%.',
    );
    renderPreview();
  } catch (error) {
    if (request !== revision) return;
    message(
      error.message && /[А-Яа-яЁё]/u.test(error.message)
        ? error.message
        : 'Не удалось открыть файл. Выбери документ формата DOCX.',
      true,
    );
    if (template) renderPreview();
  }
}

function setWordText(node, text) {
  node.textContent = text;
  if (/^\s|\s$/u.test(text)) node.setAttributeNS(xmlNamespace, 'xml:space', 'preserve');
}

function fillParagraph(paragraph, values) {
  for (const match of [...paragraph.matches].reverse()) {
    let insert = true;
    for (const span of paragraph.spans) {
      if (span.end <= match.start || span.start >= match.end) continue;
      const before = Math.max(0, match.start - span.start);
      const after = Math.min(span.end, match.end) - span.start;
      const text = span.node.textContent;
      setWordText(span.node, text.slice(0, before) + (insert ? values[match.index] : '') + text.slice(after));
      insert = false;
    }
  }
}

async function saveFilled(event) {
  event.preventDefault();
  const current = template;
  if (!current || docSave.disabled) return;
  const values = current.inputs.map((input) => input.value);
  docSave.disabled = true;
  try {
    const archive = await JSZip.loadAsync(current.bytes);
    const parsed = parseTemplate(current.xml);
    for (const paragraph of parsed.paragraphs) fillParagraph(paragraph, values);
    archive.file(docPart, new XMLSerializer().serializeToString(parsed.dom));
    const blob = await archive.generateAsync({ type: 'blob', mimeType: docMime, compression: 'DEFLATE' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = current.name.replace(/\.docx$/iu, '') + ' — готово.docx';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    if (current === template) message('Готовый DOCX отправлен на скачивание.');
  } catch {
    if (current === template)
      message('Не удалось сохранить документ. Попробуй открыть шаблон ещё раз.', true);
  } finally {
    renderPreview();
  }
}

docFields.addEventListener('input', () => {
  message();
  renderPreview();
});
document.querySelector('#dm-form').addEventListener('submit', saveFilled);
document.querySelector('#dm-example').addEventListener('click', () => openTemplate(null, true));
docInput.addEventListener('change', () => {
  const file = docInput.files[0];
  docInput.value = '';
  if (file) openTemplate(file);
});
openTemplate(null, true);
