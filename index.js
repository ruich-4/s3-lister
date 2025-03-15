import { AwsClient } from "aws4fetch";

function parseListObjectsXml(xmlString) {
  try {
    const contents = [];

    const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let contentsMatch;

    while ((contentsMatch = contentsRegex.exec(xmlString)) !== null) {
      const contentText = contentsMatch[1];
      const keyMatch = /<Key>(.*?)<\/Key>/s.exec(contentText);
      const sizeMatch = /<Size>(.*?)<\/Size>/s.exec(contentText);
      const lastModifiedMatch = /<LastModified>(.*?)<\/LastModified>/s.exec(
        contentText
      );

      if (keyMatch && sizeMatch && lastModifiedMatch) {
        contents.push({
          Key: keyMatch[1],
          Size: parseInt(sizeMatch[1], 10),
          LastModified: lastModifiedMatch[1]
        });
      }
    }

    return contents;
  } catch (error) {
    console.error("Error parsing XML:", error);
    return [];
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function generateHtml(path, items, isRoot, host_name) {
  const pathParts = path.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const href = "/" + pathParts.slice(0, index + 1).join("/");
    return `<a href="${href}">${part}</a>`;
  });

  const pathClass = isRoot ? "root-path" : "sub-path";

  return `
  <!DOCTYPE html>
  <html>
     <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Directory listing - ${path}</title>
        <style>
           /* 样式部分省略，保持原样 */
           :root {
           --main-bg-color: #fafafa;
           --header-bg-color: #f5f5f5;
           --border-color: #e0e0e0;
           --hover-bg-color: #f0f0f0;
           --text-color: #333;
           --meta-text-color: #666;
           }
           * {
           margin: 0;
           padding: 0;
           box-sizing: border-box;
           }
           body {
           font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
           background: var(--main-bg-color);
           color: var(--text-color);
           line-height: 1.5;
           }
           #main {
           max-width: 1200px;
           margin: 0 auto;
           padding: 20px;
           }
           #breadcrumb {
           background: var(--header-bg-color);
           padding: 10px 20px;
           border-bottom: 1px solid var(--border-color);
           margin-bottom: 20px;
           }
           #breadcrumb a {
           color: var(--text-color);
           text-decoration: none;
           }
           #breadcrumb a:hover {
           text-decoration: underline;
           }
           .path-separator {
           color: var(--meta-text-color);
           margin: 0 8px;
           }
           .current-folder-only {
           display: none;
           }
           .host-name,
           .full-path {
           display: inline;
           }
           .items {
           border: 1px solid var(--border-color);
           border-radius: 4px;
           background: white;
           }
           .header {
           display: grid;
           grid-template-columns: 24px 1fr 190px 90px;
           padding: 8px 16px;
           border-bottom: 1px solid var(--border-color);
           background: var(--header-bg-color);
           font-weight: bold;
           }
           .header a {
           text-decoration: none;
           color: var(--text-color);
           display: flex;
           align-items: center;
           }
           .header .sort {
           width: 12px;
           height: 12px;
           margin-left: 5px;
           }
           .item {
           display: grid;
           grid-template-columns: 24px 1fr 160px 120px;
           padding: 8px 16px;
           border-bottom: 1px solid var(--border-color);
           text-decoration: none;
           color: var(--text-color);
           }
           .item:last-child {
           border-bottom: none;
           }
           .item:hover {
           background: var(--hover-bg-color);
           }
           .item-icon {
           width: 24px;
           height: 24px;
           display: flex;
           align-items: center;
           justify-content: center;
           }
           .item-name {
           overflow: hidden;
           text-overflow: ellipsis;
           white-space: nowrap;
           }
           .item-size, .item-date {
           text-align: right;
           color: var(--meta-text-color);
           }
           @media (max-width: 768px) {
           .item {
           grid-template-columns: 24px 1fr 80px;
           }
           .header {
           grid-template-columns: 24px 1fr 80px;
           }
           #sort-date {
           display: none;
           }
           #sort-size {
           justify-self: end;
           }
           .item-date {
           display: none;
           }
           .host-name {
           font-weight: normal;
           }
           .root-path .host-name {
           font-weight: bold;
           }
           .sub-path .host-name,
           .sub-path .path-separator,
           .sub-path .full-path {
           display: none;
           }
           .sub-path .current-folder-only {
           display: inline;
           font-weight: bold;
           }
           }
           .folder-icon {
           color: #FFA000;
           }
           .file-icon {
           color: #90A4AE;
           }
           .back-button {
           cursor: pointer;
           }
           .host-name-link {
           text-decoration: none;
           color: var(--text-color);
           }
           .root-path .host-name {
           font-weight: bold;
           }
           .sub-path .full-path > a:last-child {
           font-weight: bold;
           }
           @media (max-width: 768px) {
           .root-path .host-name-link .host-name {
           font-weight: bold;
           }
           .sub-path .current-folder-only {
           display: inline;
           font-weight: bold;
           }
           }
        </style>
        <script>
           document.addEventListener("DOMContentLoaded", function () {
             const itemsContainer = document.querySelector(".items");
           
             let sortDirection = {
               name: -1,
               date: -1,
               size: -1
             };
           
             function parseSize(sizeStr) {
               if (!sizeStr || sizeStr.trim() === '-') {
                 return -1;
               }
           
               const units = {
                 'B': 1,
                 'KB': 1024,
                 'MB': 1024 * 1024,
                 'GB': 1024 * 1024 * 1024,
                 'TB': 1024 * 1024 * 1024 * 1024
               };
           
               try {
                 const parts = sizeStr.trim().split(' ');
                 if (parts.length !== 2) {
                   return 0;
                 }
           
                 const size = parseFloat(parts[0].replace(',', '.'));
                 const unit = parts[1].toUpperCase();
           
                 if (isNaN(size) || !units[unit]) {
                   return 0;
                 }
           
                 const bytes = size * units[unit];
                 return bytes;
               } catch (e) {
                 return 0;
               }
             }
           
             function sortItems(index, type, key) {
               sortDirection[key] *= -1;
               const dir = sortDirection[key];
           
               const allItems = Array.from(itemsContainer.children);
           
               const header = allItems.find(item => item.classList.contains('header'));
               const parentDir = allItems.find(item => {
                 const nameDiv = item.querySelector('.item-name');
                 return nameDiv && nameDiv.textContent.trim() === '..';
               });
               
               const itemsToSort = allItems.filter(item => {
                 if (!item.classList.contains('item')) return false;
                 const nameDiv = item.querySelector('.item-name');
                 return nameDiv && nameDiv.textContent.trim() !== '..';
               });
           
               const sortFunction = (a, b) => {
                 if (key === 'size') {
                   const aSize = a.querySelector('.item-size').textContent.trim();
                   const bSize = b.querySelector('.item-size').textContent.trim();
                                    
                   const aIsDir = aSize === '-';
                   const bIsDir = bSize === '-';
                   
                   if (aIsDir !== bIsDir) {
                     return aIsDir ? -1 : 1;
                   }
                   
                   if (aIsDir && bIsDir) {
                     return a.querySelector('.item-name').textContent.localeCompare(
                       b.querySelector('.item-name').textContent
                     ) * dir;
                   }
                   
                   const aSizeValue = parseSize(aSize);
                   const bSizeValue = parseSize(bSize);
                                    
                   if (aSizeValue === bSizeValue) {
                     return a.querySelector('.item-name').textContent.localeCompare(
                       b.querySelector('.item-name').textContent
                     ) * dir;
                   }
                   
                   return (aSizeValue - bSizeValue) * dir;
                 } else if (key === 'date') {
                   const aVal = a.querySelector('.item-' + key).textContent.trim();
                   const bVal = b.querySelector('.item-' + key).textContent.trim();
                   
                   const aIsDir = a.querySelector('.item-size').textContent.trim() === '-';
                   const bIsDir = b.querySelector('.item-size').textContent.trim() === '-';
                   
                   if (aIsDir !== bIsDir) {
                     return aIsDir ? -1 : 1;
                   }
           
                   if (aVal === '-' && bVal === '-') {
                     return a.querySelector('.item-name').textContent.localeCompare(
                       b.querySelector('.item-name').textContent
                     ) * dir;
                   }
           
                   if (aVal === '-') return 1;
                   if (bVal === '-') return -1;
           
                   return (new Date(aVal) - new Date(bVal)) * dir;
                 } else {
                   const aVal = a.querySelector('.item-' + key).textContent.trim();
                   const bVal = b.querySelector('.item-' + key).textContent.trim();
                   
                   const aIsDir = a.querySelector('.item-size').textContent.trim() === '-';
                   const bIsDir = b.querySelector('.item-size').textContent.trim() === '-';
                   
                   return aVal.localeCompare(bVal) * dir;
                 }
               };
           
               const sortedItems = itemsToSort.sort(sortFunction);
           
               itemsContainer.innerHTML = '';
           
               if (header) itemsContainer.appendChild(header);
               if (parentDir) itemsContainer.appendChild(parentDir);
               sortedItems.forEach(item => itemsContainer.appendChild(item));
           
               let sortButton;
               if (key === 'name') {
                 sortButton = document.getElementById('sort-label');
               } else {
                 sortButton = document.getElementById('sort-' + key);
               }
               updateSortIcon(sortButton, sortDirection[key]);
             }
           
             function updateSortIcon(element, direction) {
               if (!element) {
                 return;
               }
               const svg = element.querySelector('svg');
               if (svg) {
                 svg.style.transform = direction === 1 ? 'rotate(180deg)' : 'rotate(0deg)';
                 svg.style.transition = 'transform 0.2s ease';
               }
             }
           
             document.getElementById("sort-label").addEventListener("click", () => sortItems(1, "text", "name"));
             document.getElementById("sort-date").addEventListener("click", () => sortItems(2, "date", "date"));
             document.getElementById("sort-size").addEventListener("click", () => {sortItems(3, "number", "size");});
                        
             updateSortIcon(document.getElementById("sort-label"), sortDirection.name);
             updateSortIcon(document.getElementById("sort-date"), sortDirection.date);
             updateSortIcon(document.getElementById("sort-size"), sortDirection.size);
           });
        </script>
     </head>
     <body>
        <div id="breadcrumb" class="${pathClass}">
           <a href="/" class="host-name-link">
           <span class="host-name">${host_name}</span>
           </a>
           <span class="path-separator">/</span>
           <span class="full-path">
           ${breadcrumbs.join('<span class="path-separator">/</span>')}
           </span>
           <span class="current-folder-only">${
             breadcrumbs[breadcrumbs.length - 1] || host_name
           }</span>
        </div>
        <div id="main">
           <div class="items">
              <li class="header">
                 <a class="icon"></a>
                 <a id="sort-label" class="label" href="#">
                    <span class="l10n-name">Name</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" version="1.1">
                       <path d="M18 9.7 16.6 8.3 12 12.9 7.4 8.3 6 9.7l6 6z" fill="#555"/>
                    </svg>
                 </a>
                 <a id="sort-date" class="date" href="#">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" version="1.1">
                       <path d="M18 9.7 16.6 8.3 12 12.9 7.4 8.3 6 9.7l6 6z" fill="#555"/>
                    </svg>
                    <span class="l10n-lastModified">Last modified</span>
                 </a>
                 <a id="sort-size" class="size" href="#">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" version="1.1">
                       <path d="M18 9.7 16.6 8.3 12 12.9 7.4 8.3 6 9.7l6 6z" fill="#555"/>
                    </svg>
                    <span class="l10n-size">Size</span>
                 </a>
              </li>
              ${
                !isRoot
                  ? (() => {
                      let parentPath = path;
                      if (parentPath.endsWith("/")) {
                        parentPath = parentPath.slice(0, -1);
                      }
                      const lastSlashIndex = parentPath.lastIndexOf("/");
                      parentPath =
                        parentPath.substring(0, lastSlashIndex) || "/";
                      return `
              <a href="${parentPath}" class="item back-button">
                 <div class="item-icon">
                    <svg class="folder-icon" viewBox="0 0 24 24" width="24" height="24">
                       <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                 </div>
                 <div class="item-name">..</div>
                 <div class="item-date">-</div>
                 <div class="item-size">-</div>
              </a>
              `;
                    })()
                  : ""
              }
              ${items
                .map((item) => {
                  const isDirectory = item.isDirectory;
                  const fullPath =
                    path === "/"
                      ? `/${encodeURIComponent(item.name)}`
                      : `${path}${
                          path.endsWith("/") ? "" : "/"
                        }${encodeURIComponent(item.name)}`;
                  return `
              <a href="${fullPath}" class="item">
                 <div class="item-icon">
                    ${
                      isDirectory
                        ? `
                    <svg class="folder-icon" viewBox="0 0 24 24" width="24" height="24">
                       <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                    `
                        : `
                    <svg class="file-icon" viewBox="0 0 24 24" width="24" height="24">
                       <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2z"/>
                    </svg>
                    `
                    }
                 </div>
                 <div class="item-name">${item.name}</div>
                 <div class="item-date">${item.date}</div>
                 <div class="item-size">${item.size}</div>
              </a>
              `;
                })
                .join("")}
           </div>
        </div>
     </body>
  </html>`;
}

export default {
  async fetch(request, env, ctx) {
    const context = {
      request,
      env,
    };
    return await handleRequest(context);
  },
};

async function handleRequest(context) {
  const { request, env } = context;

  const host_name = env["TITLE"] || request.headers.get("host");
  const accsess_key_id = env["ACCESS_KEY_ID"];
  const secret_access_key = env["SECRET_ACCESS_KEY"];
  const bucket_name = env["BUCKET_NAME"];
  const s3_endpoint = env["S3_ENDPOINT"];
  const region = env["REGION"];
  const access_policy = env.access_policy || "private";
  const download_url = env.download_url || "";
  const path_delimiter = "/";

  const aws = new AwsClient({
    accessKeyId: accsess_key_id,
    secretAccessKey: secret_access_key,
    region: region,
  });

  const url = new URL(request.url);
  let path = decodeURIComponent(url.pathname);
  let contents = [];

  try {
    const listResponse = await aws.fetch(`${s3_endpoint}/${bucket_name}`, {
      method: "GET",
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to list objects: ${listResponse.statusText}`);
    }
    const xmlData = await listResponse.text();
    contents = parseListObjectsXml(xmlData);
  } catch (error) {
    return new Response(`Error listing files: ${error.message}`, {
      status: 500,
    });
  }
  try {
    if (path === "/") {
      const rootItems = contents.map((file) => {
        const firstPart = file.Key.split(path_delimiter)[0];
        const isDir = file.Key.indexOf(path_delimiter) !== -1;
        const isRootFile = file.Key === firstPart;
        return {
          name: firstPart,
          key: file.Key,
          isDirectory: isDir,
          size: isRootFile ? file.Size : 0,
          date: isRootFile
            ? new Date(file.LastModified).toLocaleString("zh-CN", {
                hour12: false,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : null,
        };
      });

      const uniqueItems = Array.from(
        new Map(rootItems.map((item) => [item.name, item])).values()
      ).map((item) => {
        if (item.isDirectory) {
          const folderFiles = contents.filter((f) =>
            f.Key.startsWith(item.name + "/")
          );
          const totalSize = folderFiles.reduce((sum, cur) => sum + cur.Size, 0);
          const immediateFiles = folderFiles.filter((f) => {
            const parts = f.Key.split("/");
            return parts.length === 2;
          });
          let latestModified = "-";
          if (folderFiles.length > 0) {
            const maxDate = folderFiles.reduce((latest, c) => {
              const fDate = new Date(c.LastModified);
              return fDate > latest ? fDate : latest;
            }, new Date(folderFiles[0].LastModified));
            latestModified = maxDate.toLocaleString("zh-CN", {
              hour12: false,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
          }
          return {
            ...item,
            size: totalSize,
            date: latestModified,
          };
        } else {
          return item;
        }
      });

      const sortedItems = uniqueItems.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) {
          return a.name.localeCompare(b.name);
        }
        return a.isDirectory ? -1 : 1;
      });

      const items = sortedItems.map((item) => ({
        name: item.name,
        href: item.isDirectory
          ? `${encodeURIComponent(item.name)}/`
          : encodeURIComponent(item.name),
        isDirectory: item.isDirectory,
        size:
          item.size === 0 || item.size === null ? "-" : formatBytes(item.size),
        date: item.date || "-",
      }));

      return new Response(generateHtml("/", items, true, host_name), {
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
        },
      });
    } else {
      const requestPathNoSlash = path.replace(/^\/|\/$/g, "");
      const matchingFile = contents.find(
        (file) => file.Key === requestPathNoSlash
      );

      if (matchingFile && access_policy === "private") {
        const signedRequest = await aws.sign(
          `${s3_endpoint}/${bucket_name}/${matchingFile.Key}`,
          {
            method: "GET",
            headers: {
              host: new URL(s3_endpoint).host,
            },
            expires: 3600,
          }
        );

        const redirectResponse = await fetch(signedRequest.url, {
          headers: Object.fromEntries(signedRequest.headers),
        });

        return redirectResponse;
      } else if (matchingFile && access_policy === "public" && download_url) {
        return Response.redirect(download_url + matchingFile.Key, 302);
      } else {
        const fileList = contents
          .filter((file) => file.Key.startsWith(requestPathNoSlash))
          .map((file) =>
            file.Key.replace(requestPathNoSlash, "").replace(/^\//, "")
          );
        const uniqueNames = fileList
          .map((file) => file.split(path_delimiter)[0])
          .filter(Boolean)
          .filter((value, index, self) => self.indexOf(value) === index);

        const items = uniqueNames.map((name) => {
          const isDirectory = contents.some((c) =>
            c.Key.startsWith(`${requestPathNoSlash}/${name}/`)
          );
          const fileEntry = contents.find(
            (c) => c.Key === `${requestPathNoSlash}/${name}`
          );
          if (isDirectory) {
            const folderFiles = contents.filter((c) =>
              c.Key.startsWith(`${requestPathNoSlash}/${name}/`)
            );
            const totalSize = folderFiles.reduce((sum, c) => sum + c.Size, 0);
            const immediateFiles = folderFiles.filter((c) => {
              const relativePath = c.Key.replace(
                `${requestPathNoSlash}/${name}/`,
                ""
              );
              return !relativePath.includes("/");
            });
            let latestModified = "-";
            if (folderFiles.length > 0) {
              const maxDate = folderFiles.reduce((latest, c) => {
                const fDate = new Date(c.LastModified);
                return fDate > latest ? fDate : latest;
              }, new Date(folderFiles[0].LastModified));
              latestModified = maxDate.toLocaleString("zh-CN", {
                hour12: false,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
            }
            return {
              name,
              href: encodeURIComponent(name) + "/",
              isDirectory,
              size: formatBytes(totalSize),
              date: latestModified,
            };
          } else {
            return {
              name,
              href: encodeURIComponent(name),
              isDirectory,
              size: fileEntry ? formatBytes(fileEntry.Size) : "-",
              date:
                fileEntry && fileEntry.LastModified
                  ? new Date(fileEntry.LastModified).toLocaleString("zh-CN", {
                      hour12: false,
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "-",
            };
          }
        });

        const sortedItems = items.sort((a, b) => {
          if (a.isDirectory === b.isDirectory) {
            return a.name.localeCompare(b.name);
          }
          return a.isDirectory ? -1 : 1;
        });

        return new Response(generateHtml(path, sortedItems, false, host_name), {
          headers: {
            "Content-Type": "text/html; charset=UTF-8",
          },
        });
      }
    }
  } catch (error) {
    return new Response(`Error listing files: ${error.message}`, {
      status: 500,
    });
  }
}
