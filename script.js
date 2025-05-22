const sheetUrl = 'https://script.google.com/macros/s/AKfycbz697HwcqEkJmSOZgHvK4EDEl3HOiQxeAiCIuWmsakiGDZIXlMA-ZdEgFrgx0PotAR7zQ/exec'; // Replace with your deployed Google Apps Script URL


//const sheetUrl = 'https://script.google.com/macros/s/AKfycbwSYxpfeW4yWiy9SZGzxsCp6b_J1rZQOw4R0uYUS-GUeqWb40D9GXXZs7xBpaqmB66cVg/exec';

async function fetchData() {
  const response = await fetch(sheetUrl);
  return await response.json();
}

function populateTable(data, tableId, columns, filterFn) {
  const tableBody = document.querySelector(`#${tableId} tbody`);
  tableBody.innerHTML = '';
  data.filter(filterFn).forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(colIndex => {
      const td = document.createElement('td');
      td.textContent = row[colIndex] || '';
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const response = await fetchData();
  const teacherData = response.teachers.slice(1); // skip header
  const snackData = response.snacks.slice(1); // skip header
  const page = location.pathname;

  // Form submission (only on index.html)
  const form = document.getElementById('addVisitForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {
        date: formData.get('date'),
        place: formData.get('place'),
        teachers: formData.get('teachers'),
        snack: formData.get('snack')
      };
      const res = await fetch(sheetUrl, {
        method: 'POST',
        redirect: "follow",
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        }
      });
      const result = await res.json();
      if (result.status === 'success') {
        alert(`Added ${result.added} teacher entries!`);
        location.reload();
      } else {
        alert('Error adding data');
      }
    });
  }

  // Helper map for snacks by date|place
  const snackMap = new Map(snackData.map(row => [`${row[0]}|${row[1]}`, row[2]]));

  if (page.endsWith('index.html') || page.endsWith('/')) {
    // Show all visits with snack amount
    const merged = teacherData.map(row => [...row, snackMap.get(`${row[0]}|${row[1]}`) || '']);
    populateTable(merged, 'visitsTable', [0,1,2,3], () => true);

  } else if (page.endsWith('teacher.html')) {
    // Populate teacher dropdown
    const teachers = [...new Set(teacherData.map(row => row[2]))];
    const select = document.getElementById('teacherSelect');
    teachers.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      if (!select.value) {
        populateTable([], 'teacherTable', [0,1,2], () => false);
        return;
      }
      const selected = teacherData.filter(row => row[2] === select.value);
      const enriched = selected.map(row => [row[0], row[1], snackMap.get(`${row[0]}|${row[1]}`) || '']);
      populateTable(enriched, 'teacherTable', [0,1,2], () => true);
    });

  } else if (page.endsWith('place.html')) {
    // Populate place dropdown
    const places = [...new Set(teacherData.map(row => row[1]))];
    const select = document.getElementById('placeSelect');
    places.forEach(place => {
      const opt = document.createElement('option');
      opt.value = place;
      opt.textContent = place;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      if (!select.value) {
        populateTable([], 'placeTable', [0,1,2], () => false);
        return;
      }
      const selected = teacherData.filter(row => row[1] === select.value);
      const enriched = selected.map(row => [row[0], row[2], snackMap.get(`${row[0]}|${row[1]}`) || '']);
      populateTable(enriched, 'placeTable', [0,1,2], () => true);
    });

  } else if (page.endsWith('gist.html')) {
    // Monthly gist report for current month
    const currentMonth = new Date().getMonth();
    const filtered = teacherData.filter(row => new Date(row[0]).getMonth() === currentMonth);
    const snackThisMonth = snackData.filter(row => new Date(row[0]).getMonth() === currentMonth);

    document.getElementById('totalVisits').textContent = filtered.length;
    document.getElementById('totalSnacks').textContent = snackThisMonth.reduce((sum, r) => sum + (parseFloat(r[2]) || 0), 0);
    document.getElementById('uniqueTeachers').textContent = new Set(filtered.map(r => r[2])).size;
    document.getElementById('uniquePlaces').textContent = new Set(filtered.map(r => r[1])).size;
  }
});

