
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        coaList: [],
        coaNameList: [],
        coaHierachyList: [],
        name: '',
        parentId: ''

    },

    methods: {

        getSetupData() {

            axios.get('/LedgerSetups/GetChartOfAccounts').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get chart of accounts.');

            });
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Search] },
                //toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                    { field: "name",  headerText: "Chart of Account", width: 75, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endEdit: (args) => {

                    this.updateCoa(args.data);
                },
                endDelete: (args) => {

                    this.delCoa(args.data.id);
                },
            });

        },

        saveCoa() {

            let payload = {};

            this.isLoading = true;

            payload.name = this.name;
            payload.parentId = this.emptyGuid;

            if (this.parentId) {

                payload.parentId = this.parentId;

            }

            axios.post('/LedgerSetups/CreateChartOfAccount', payload).then(response => {

                this.getSetupData();

                this.name = '';
                this.isLoading = false;

                this.toastHandler('', 'Chart of account saved.');

            }).catch(err => {

                this.isLoading = false;

                this.toastHandler('error', 'Unable to save chart of account.');

            });
        },

        updateCoa(payload) {

            payload.name = payload.rawName;

            delete payload.rawName;

            axios.post('/LedgerSetups/UpdateChartOfAccount', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Chart of account updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update chart of account.');

            });
        },

        delCoa(id) {

            axios.get('/LedgerSetups/DelChartOfAccount?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Chart of account deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete chart of account.');

            });
        },

        parseHierachy(dataArr) {

            this.coaList = dataArr;

            var coaHierachyList = [];

            for (var i = 0; i < this.coaList.length; i++) {

                this.getHierachyName(this.coaList[i].id);

                var name = [...new Set(this.coaNameList)].join().replace(/,/g, '/');

                coaHierachyList.push({
                    name: name,
                    parentId: this.coaList[i].parentId,
                    id: this.coaList[i].id,
                    rawName: this.coaList[i].name,
                    tenantId: this.coaList[i].tenantId,
                });

                name = [];

                this.coaNameList = [];

            }

            //console.log(costCenterHierachyList);

            this.coaHierachyList = coaHierachyList;

            this.renderTable(coaHierachyList);

        },

        getHierachyName(id) {

            let parentId;
            let returnName;

            this.coaList.forEach(item => {

                if (item.id == id) {
                    parentId = item.parentId;
                    returnName = item.name;
                }

                this.coaList.forEach(cc => {
                    if (cc.id == parentId) {
                        return (`${this.getHierachyName(parentId)} / ${returnName}`);
                    }
                })

            });

            this.coaNameList.push(returnName);

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