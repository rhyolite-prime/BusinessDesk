const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            locationList: [],
            transportationUnitList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get('/SmMainSetups/ListAllTransportationLocations').then(response => {
                this.dataTable(response.data);
            }).catch(() => this.toastHandler('error', 'Unable to get data.'));
        },
        getLocations() {
            axios.get('/SmMainSetups/ListAllLocations').then(response => {
                this.locationList = response.data;
            }).catch(() => this.toastHandler('error', 'Unable to get locations.'));
        },
        getUnits() {
            axios.get('/SmMainSetups/ListAllTransportationUnits').then(response => {
                this.transportationUnitList = response.data;
            }).catch(() => this.toastHandler('error', 'Unable to get units.'));
        },
        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: { pageSize: 20, pageSizeList: [10, 20, 50, 100] },
                scrollSettings: { width: "1200px", height: "400px" },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", visible: false, isPrimaryKey: true },
                    { field: "locationId", headerText: "Location", width: 120, editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", dataSource: this.locationList },
                    { field: "transportationUnitId", headerText: "Transportation Unit", width: 120, editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "unitName", dataSource: this.transportationUnitList },
                    { field: "amount", headerText: "Amount", width: 100, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}" },
                    { field: "tenantId", visible: false }
                ],
                endAdd: (args) => {
                    //location
                    if (!args.data.locationId || args.data.locationId === this.emptyGuid) {
                        args.data.locationId = this.locationId;
                    }
                    const selectedLocation = this.locationList.find(a => a.id === args.data.locationId);
                    if (selectedLocation) {
                        args.data.locationName = selectedLocation.name;
                    } else {
                        args.data.locationName = "unknown";
                    }
                    //transportation unit
                    if (!args.data.transportationUnitId || args.data.transportationUnitId === this.emptyGuid) {
                        args.data.transportationUnitId = this.transportationUnitId;
                    }
                    const selectedUnit = this.transportationUnitList.find(a => a.id === args.data.transportationUnitId);
                    if (selectedUnit) {
                        args.data.transportationUnitName = selectedUnit.unitName;
                    } else {
                        args.data.transportationUnitName = "unknown";
                    }
                    
                    this.saveTransportationLocation(args.data)},
                endEdit: (args) => {
                    //location
                    if (!args.data.locationId || args.data.locationId === this.emptyGuid) {
                        args.data.locationId = this.locationId;
                    }
                    const selectedLocation = this.locationList.find(a => a.id === args.data.locationId);
                    if (selectedLocation) {
                        args.data.locationName = selectedLocation.name;
                    } else {
                        args.data.locationName = "unknown";
                    }
                    //transportation unit
                    if (!args.data.transportationUnitId || args.data.transportationUnitId === this.emptyGuid) {
                        args.data.transportationUnitId = this.transportationUnitId;
                    }
                    const selectedUnit = this.transportationUnitList.find(a => a.id === args.data.transportationUnitId);
                    if (selectedUnit) {
                        args.data.transportationUnitName = selectedUnit.unitName;
                    } else {
                        args.data.transportationUnitName = "unknown";
                    }
                    this.updateTransportationLocation(args.data)},
                endDelete: (args) => this.delTransportationLocation(args.data.id)
            });
        },
        saveTransportationLocation(payload) {
            delete payload.id; delete payload.tenantId;
            axios.post('/SmMainSetups/CreateTransportationLocation', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }
            }).catch(() => this.toastHandler('error', 'Unable to save data.'));
        },
        updateTransportationLocation(payload) {
            axios.post('/SmMainSetups/UpdateTransportationLocation', payload).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data updated.');
            }).catch(() => this.toastHandler('error', 'Unable to update data.'));
        },
        delTransportationLocation(id) {
            axios.get('/SmMainSetups/DeleteTransportationLocation?id=' + id).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data deleted.');
            }).catch(() => this.toastHandler('error', 'Unable to delete data.'));
        },
        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = { closeButton: true, progressBar: true, showMethod: 'fadeIn', hideMethod: 'fadeOut', timeOut: 10000 };
            switch (type) {
                case 'warning': toastr.warning('', message); break;
                case 'error': toastr.error('', message); break;
                default: toastr.success('', message); break;
            }
        }
    },
    mounted() {
        this.getLocations();
        this.getUnits();
        this.getSetupData();
    }
});
app.mount('#app');
