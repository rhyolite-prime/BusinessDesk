let vue = new Vue({
        el: '#app',
        data: {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            costCenterList: [],
            costCenterNameList: [],
            costCenterHierachyList: [],
            name: '',
            parentId: ''
    },

    methods: {

        getSetupData() {

            axios.get('/SharedResource/GetCostCenters').then(response => {
                 
                this.parseHierachy(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get cost centers.');

            });
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                    { field: "rawName", validationRules: { required: true, minlength: 1 }, headerText: "Cost Center", width: 75, },
                    { field: "name", validationRules: { required: true, minlength: 1 }, headerText: "Parent Hierachy", width: 95, allowEditing: false },
                    { field: "parentId", visible: false, headerText: "parentId", width: 15, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endEdit: (args) => {

                    this.updateCostCenter(args.data);
                },
                endDelete: (args) => {

                    this.delCostCenter(args.data.id);
                },
            });

        },

        saveCostCenter() {

            let payload = {};


            if (!this.name) {
                this.toastHandler('warning', 'Enter a cost center name');
                return;
            }

            this.isLoading = true;

            payload.name = this.name;
            payload.parentId = this.emptyGuid;

            if (this.parentId) {
                payload.parentId = this.parentId;

            }

            axios.post('/SharedResource/CreateCostCenter', payload).then(response => {

                this.getSetupData();
                this.name = '';
                this.isLoading = false;

                if (response.data.code === 200) {
                    this.toastHandler('', 'Cost center saved.');

                }
                else {
                    this.toastHandler('error', response.data.message);

                }

            }).catch(err => {

                this.isLoading = false;

                this.toastHandler('error', 'Unable to save cost center.');

            });
        },
        
        updateCostCenter(payload) {

            payload.name = payload.rawName;
            delete payload.rawName;

            axios.post('/SharedResource/UpdateCostCenter', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Cost center updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update cost center.');

            });
        },

        delCostCenter(id) {

            axios.get('/SharedResource/DelCostCenter?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Cost center deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete cost center.');

            });
        },

        parseHierachy(dataArr) {

            this.costCenterList = dataArr;

            let costCenterHierachyList = [];

            for (let i = 0; i < this.costCenterList.length; i++) {

                this.getHierachyName(this.costCenterList[i].id);

                let name = [...new Set(this.costCenterNameList)].join().replace(/,/g, '/');

                costCenterHierachyList.push({
                    name: name,
                    parentId: this.costCenterList[i].parentId,
                    id: this.costCenterList[i].id,
                    rawName: this.costCenterList[i].name,
                    tenantId: this.costCenterList[i].tenantId,
                });

                name = [];

                this.costCenterNameList = [];

            }

            //console.log(costCenterHierachyList);

            this.costCenterHierachyList = costCenterHierachyList;

            this.renderTable(costCenterHierachyList);
             
        },

        getHierachyName(id) {

            let parentId;
            let returnName;
            this.costCenterList.forEach(item => {

                if (item.id === id) {
                    parentId = item.parentId;
                    returnName = item.name;
                }

                this.costCenterList.forEach(cc => {
                    if (cc.id === parentId) {
                        return (`${this.getHierachyName(parentId)} / ${returnName}`);
                    }
                })

            });

            this.costCenterNameList.push(returnName);

        },

        toastHandler(type, message = 'An unexpected error occurred.') {

            //display alert with 
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };

            switch (type) {

                case 'warning':
                    toastr.warning('', message);
                    break;
                case 'error':
                    toastr.error('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }

        },

        
    },

    created() {

        this.getSetupData();
    },
});
