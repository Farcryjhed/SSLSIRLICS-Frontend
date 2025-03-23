var selectedRow = null

function onFormSubmit(e) {
	event.preventDefault();
        var formData = readFormData();
        if (selectedRow == null){
            insertNewRecord(formData);
		}
        else{
            updateRecord(formData);
		}
        resetForm();    
}

//Retrieve the data
function readFormData() {
    var formData = {};
    formData["socid"] = document.getElementById("socid").value;
    formData["province"] = document.getElementById("province").value;
    formData["municipality"] = document.getElementById("municipality").value;
    formData["barangay"] = document.getElementById("barangay").value;
    formData["lat"] = document.getElementById("lat").value;
    formData["long"] = document.getElementById("long").value;
    formData["area_descr"] = document.getElementById("area_descr").value;

    return formData;
}

//Insert the data
function insertNewRecord(data) {
    var table = document.getElementById("storeList").getElementsByTagName('tbody')[0];
    var newRow = table.insertRow(table.length);
    cell1 = newRow.insertCell(0);
		cell1.innerHTML = data.socid;
    cell2 = newRow.insertCell(1);
		cell2.innerHTML = data.province;
    cell3 = newRow.insertCell(2);
		cell3.innerHTML = data.municipality;
    cell4 = newRow.insertCell(3);
		cell4.innerHTML = data.barangay;
    cell5 = newRow.insertCell(4);
		cell5.innerHTML = data.lat;
    cell6 = newRow.insertCell(5);
		cell6.innerHTML = data.long;
    cell7 = newRow.insertCell(6);
		cell7.innerHTML = data.area_descr; 
    cell7 = newRow.insertCell(7);
        cell7.innerHTML = `<button onClick="onEdit(this)">Edit</button> <button onClick="onDelete(this)">Delete</button>`;
}

//Edit the data
function onEdit(td) {
    selectedRow = td.parentElement.parentElement;
    document.getElementById("socid").value = selectedRow.cells[0].innerHTML;
    document.getElementById("province").value = selectedRow.cells[1].innerHTML;
    document.getElementById("municipality").value = selectedRow.cells[2].innerHTML;
    document.getElementById("barangay").value = selectedRow.cells[3].innerHTML;
    document.getElementById("lat").value = selectedRow.cells[4].innerHTML;
    document.getElementById("long").value = selectedRow.cells[5].innerHTML;
    document.getElementById("area_descr").value = selectedRow.cells[6].innerHTML;
}
function updateRecord(formData) {
    selectedRow.cells[0].innerHTML = formData.socid;
    selectedRow.cells[1].innerHTML = formData.province;
    selectedRow.cells[2].innerHTML = formData.municipality;
    selectedRow.cells[3].innerHTML = formData.barangay;
    selectedRow.cells[4].innerHTML = formData.lat;
    selectedRow.cells[5].innerHTML = formData.long;
    selectedRow.cells[6].innerHTML = formData.area_descr;
}

//Delete the data
function onDelete(td) {
    if (confirm('Do you want to delete this record?')) {
        row = td.parentElement.parentElement;
        document.getElementById('storeList').deleteRow(row.rowIndex);
        resetForm();
    }
}

//Reset the data
function resetForm() {
    document.getElementById("socid").value = '';
    document.getElementById("province").value = '';
    document.getElementById("municipality").value = '';
    document.getElementById("barangay").value = '';
    document.getElementById("lat").value = '';
    document.getElementById("long").value = '';
    document.getElementById("area_descr").value = '';
    selectedRow = null;
}
