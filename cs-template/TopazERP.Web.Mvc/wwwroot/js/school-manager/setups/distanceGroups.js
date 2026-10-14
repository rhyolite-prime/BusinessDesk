const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            distanceGroupList: [],
            unitList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get('/SmMainSetups/ListAllDistanceGroups').then(response => {
                this.distanceGroupList = response.data;
                this.dataTable(response.data);
            }).catch(() => {
                this.toastHandler('error', 'Unable to get data.');
            });
        },
        getUnits() {
            axios.get('/jsonDataSample/distanceUnits.json').then(response => {

                this.unitList = response.data;
                this.dataTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get data.');

            });

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
                    { field: "description", headerText: "Description", validationRules: { required: true }, width: 100 },
                    { field: "distanceUnitId", headerText: "Distance Unit", width: 100 ,editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "unitName", textAlign: ej.TextAlign.Left,  dataSource: this.unitList},
                    { field: "distanceFrom", headerText: "From", width: 75, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, },
                    { field: "distanceTo", headerText: "To ", width: 75, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, },
                    { field: "amount", headerText: "Amount", width: 75,defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}" },
                    { field: "tenantId", visible: false }
                ],
                endAdd: (args) => {
                    if (!args.data.distanceUnitId || args.data.distanceUnitId === this.emptyGuid) {
                        args.data.distanceUnitId = this.distanceUnitId;
                    }
                    const selectedUnit = this.unitList.find(a => a.id === args.data.distanceUnitId);
                    if (selectedUnit) {
                        args.data.distanceUnitName = selectedUnit.unitName;
                    } else {
                        args.data.distanceUnitName = "unknown";
                    }
                    this.saveDistanceGroup(args.data)},
                endEdit: (args) => {
                    if (!args.data.distanceUnitId || args.data.distanceUnitId === this.emptyGuid) {
                        args.data.distanceUnitId = this.distanceUnitId;
                    }
                    const selectedUnit = this.unitList.find(a => a.id === args.data.distanceUnitId);
                    if (selectedUnit) {
                        args.data.distanceUnitName = selectedUnit.unitName;
                    } else {
                        args.data.distanceUnitName = "unknown";
                    }
                    this.updateDistanceGroup(args.data)},
                endDelete: (args) => this.delDistanceGroup(args.data.id)
            });
        },

        saveDistanceGroup(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmMainSetups/CreateDistanceGroup/', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message)
                    this.getSetupData();
                }
            }).catch(() => this.toastHandler('error', 'Unable to save data.'));
        },

        updateDistanceGroup(payload) {
            axios.post('/SmMainSetups/UpdateDistanceGroup/', payload).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data updated.');
            }).catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        delDistanceGroup(id) {
            axios.get('/SmMainSetups/DeleteDistanceGroup?id=' + id).then(() => {
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
        this.getUnits();
        this.getSetupData();
    }
});
app.mount('#app');