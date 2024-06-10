console.log('popup.js loaded'); // Debugging line to ensure the script is loaded

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired'); // Debugging line to check if DOM content is loaded

    const compareButton = document.getElementById('compare-button');
    if (compareButton) {
        compareButton.addEventListener('click', () => {
            console.log('Compare button clicked'); // Debugging line to ensure the button click is registered
            comparePages();
        });
    } else {
        console.log('Compare button not found'); // Debugging line to ensure the button element is present
    }
});

async function comparePages() {
    const targetUrl = document.getElementById('compare-url').value;
    console.log('Target URL:', targetUrl); // Debugging line
    if (!targetUrl) {
        alert('Please enter a URL to compare.');
        return;
    }

    let countdownTime = 300; // Set countdown time in seconds (5 minutes)
    const countdownElement = document.getElementById('countdown');
    countdownElement.style.display = 'block'; // Ensure countdown element is visible
    updateCountdown(countdownElement, countdownTime);

    const countdownInterval = setInterval(() => {
        countdownTime -= 1;
        updateCountdown(countdownElement, countdownTime);

        if (countdownTime <= 0) {
            clearInterval(countdownInterval);
            countdownElement.textContent = 'Time is up!';
        }
    }, 1000);

    // Fetch current page content
    const currentTab = await getCurrentTab();
    const currentUrl = currentTab.url;
    console.log('Current URL:', currentUrl); // Debugging line
    const currentResponse = await fetch(currentUrl);
    const currentPageHTML = await currentResponse.text();
    const currentDoc = new DOMParser().parseFromString(currentPageHTML, 'text/html');
    const currentPageContent = extractPageContent(currentDoc);
    console.log('Current Page Content:', currentPageContent); // Debugging line

    // Fetch target page content
    const targetResponse = await fetch(targetUrl);
    const targetPageHTML = await targetResponse.text();
    const targetDoc = new DOMParser().parseFromString(targetPageHTML, 'text/html');
    const targetPageContent = extractPageContent(targetDoc);
    console.log('Target Page Content:', targetPageContent); // Debugging line

    // Compare and display differences
    displayDifferences(currentPageContent, targetPageContent);
    document.getElementById('comparisonResults').style.display = 'block'; // Show the result section

    // Stop the timer and hide it
    clearInterval(countdownInterval);
    countdownElement.style.display = 'none';
}

async function getCurrentTab() {
    return new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            resolve(tabs[0]);
        });
    });
}

function extractPageContent(doc) {
    const content = {
        metaTags: []
    };

    doc.querySelectorAll('meta').forEach(meta => {
        const tagName = meta.getAttribute('name') || meta.getAttribute('property') || meta.getAttribute('http-equiv');
        const contentValue = meta.getAttribute('content');

        if (tagName && contentValue) {
            content.metaTags.push({ tagName, contentValue });
        }
    });

    return content;
}

function displayDifferences(current, target) {
    displayTable('meta-comparison', current.metaTags, target.metaTags);
}

function displayTable(tableId, currentData, targetData) {
    const tbody = document.getElementById(tableId).querySelector('tbody');
    tbody.innerHTML = '';

    const matchedIndices = new Set();

    currentData.forEach((currentItem, currentIndex) => {
        const currentContent = currentItem.contentValue;
        const currentTagName = currentItem.tagName;

        let matchedTargetIndex = -1;

        for (let i = 0; i < targetData.length; i++) {
            if (matchedIndices.has(i)) continue; // Skip already matched target items

            const targetItem = targetData[i];
            const targetContent = targetItem.contentValue;
            const targetTagName = targetItem.tagName;

            if (
                currentTagName === targetTagName
                // currentContent.length === targetContent.length &&
                // currentContent.slice(0, 10) === targetContent.slice(0, 10)
            ) {
                matchedTargetIndex = i;
                matchedIndices.add(i);
                break;
            }
        }

        const row = document.createElement('tr');
        const currentCell = document.createElement('td');
        const targetCell = document.createElement('td');

        currentCell.innerText = JSON.stringify(currentItem);
        if (matchedTargetIndex !== -1) {
            targetCell.innerText = JSON.stringify(targetData[matchedTargetIndex]);
        } else {
            targetCell.innerText = '';
        }

        if (matchedTargetIndex !== -1) {
            currentCell.style.backgroundColor = 'lightgreen';
            targetCell.style.backgroundColor = 'lightgreen';
        } else {
            currentCell.style.backgroundColor = 'lightcoral';
        }

        row.appendChild(currentCell);
        row.appendChild(targetCell);
        tbody.appendChild(row);
    });

    // Add remaining unmatched target items
    targetData.forEach((targetItem, targetIndex) => {
        if (!matchedIndices.has(targetIndex)) {
            const row = document.createElement('tr');
            const currentCell = document.createElement('td');
            const targetCell = document.createElement('td');

            currentCell.innerText = '';
            targetCell.innerText = JSON.stringify(targetItem);
            targetCell.style.backgroundColor = 'lightcoral';

            row.appendChild(currentCell);
            row.appendChild(targetCell);
            tbody.appendChild(row);
        }
    });
}

function updateCountdown(element, time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    element.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
