var selectedRow = null;

function onFormSubmit(e) {
    event.preventDefault();
    var formData = readFormData();
    if (selectedRow == null) {
        insertNewRecord(formData);
    } else {
        updateRecord(formData);
    }
    resetForm();
}

// Retrieve the data
function readFormData() {
    return {
        socid: document.getElementById("socid").value,
        province: document.getElementById("province").value,
        municipality: document.getElementById("municipality").value,
        barangay: document.getElementById("barangay").value,
        long: document.getElementById("long").value, // Longitude
        lat: document.getElementById("lat").value, // Latitude
        area_descr: document.getElementById("area_descr").value
    };
}

// Insert the data (Without shifting the table)
function insertNewRecord(data) {
    var table = document.getElementById("storeList").getElementsByTagName('tbody')[0];
    var newRow = table.insertRow();

    newRow.insertCell(0).innerHTML = data.socid;
    newRow.insertCell(1).innerHTML = data.province;
    newRow.insertCell(2).innerHTML = data.municipality;
    newRow.insertCell(3).innerHTML = data.barangay;
    newRow.insertCell(4).innerHTML = data.long;
    newRow.insertCell(5).innerHTML = data.lat;
    newRow.insertCell(6).innerHTML = data.area_descr;

    // Action buttons (Fixed width)
    let actionCell = newRow.insertCell(7);
    actionCell.innerHTML = `
        <div class="d-flex justify-content-center gap-2">
            <button class="btn btn-sm btn-warning" onClick="onEdit(this)">Edit</button>
            <button class="btn btn-sm btn-danger" onClick="onDelete(this)">Delete</button>
        </div>
    `;
    actionCell.style.textAlign = "center";
}

// Edit the data
function onEdit(td) {
    selectedRow = td.parentElement.parentElement;
    document.getElementById("socid").value = selectedRow.cells[0].innerHTML;
    document.getElementById("province").value = selectedRow.cells[1].innerHTML;
    document.getElementById("municipality").value = selectedRow.cells[2].innerHTML;
    document.getElementById("barangay").value = selectedRow.cells[3].innerHTML;
    document.getElementById("long").value = selectedRow.cells[4].innerHTML;
    document.getElementById("lat").value = selectedRow.cells[5].innerHTML;
    document.getElementById("area_descr").value = selectedRow.cells[6].innerHTML;
}

// Update the data
function updateRecord(formData) {
    selectedRow.cells[0].innerHTML = formData.socid;
    selectedRow.cells[1].innerHTML = formData.province;
    selectedRow.cells[2].innerHTML = formData.municipality;
    selectedRow.cells[3].innerHTML = formData.barangay;
    selectedRow.cells[4].innerHTML = formData.long;
    selectedRow.cells[5].innerHTML = formData.lat;
    selectedRow.cells[6].innerHTML = formData.area_descr;
}

// Delete the data
function onDelete(td) {
    if (confirm('Do you want to delete this record?')) {
        row = td.parentElement.parentElement;
        document.getElementById('storeList').deleteRow(row.rowIndex);
        resetForm();
    }
}

// Reset the form
function resetForm() {
    document.getElementById("socid").value = '';
    document.getElementById("province").value = '';
    document.getElementById("municipality").value = '';
    document.getElementById("barangay").value = '';
    document.getElementById("long").value = '';
    document.getElementById("lat").value = '';
    document.getElementById("area_descr").value = '';
    selectedRow = null;
}

// Search SOCID Functionality
function searchSOCID() {
    var input = document.getElementById("searchInput").value.trim().toLowerCase();
    var table = document.getElementById("storeList").getElementsByTagName('tbody')[0];
    var rows = table.getElementsByTagName("tr");
    var foundRow = null;

    // Reset previous highlights
    for (var i = 0; i < rows.length; i++) {
        rows[i].style.backgroundColor = ""; 
    }

    for (var i = 0; i < rows.length; i++) {
        var socidCell = rows[i].cells[0];
        if (socidCell) {
            var socidText = socidCell.innerText.trim().toLowerCase();

            if (socidText === input) {
                foundRow = rows[i];
                break; 
            }
        }
    }

    if (foundRow) {
        foundRow.style.backgroundColor = "lightgreen"; // Highlight in green

        // Move the found row to the top
        table.insertBefore(foundRow, table.firstChild);
    } else {
        alert("SOCID not found!");
    }

    // Keep focus on search bar
    document.getElementById("searchInput").focus();
}

// Trigger search when pressing Enter in the search bar
document.getElementById("searchInput").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Prevent form submission if inside a form
        searchSOCID();
    }
});
