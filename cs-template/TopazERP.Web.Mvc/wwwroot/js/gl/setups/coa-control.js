
Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        coaList: [],
        coaNameList: [],
        coaHierachyList: [],
        coaControlList: [],
        coaControlNameList: [],
        coaControlHierachyList: [],
        name: '',
        parentId: '',
        selectedAccountGroupId: '',
        parentAccountHeaderId: '',
        accountHeaderName: '',
        minAccount: '',
        maxAccount: '',

    },


    methods: {

        getChartOfAccounts() {

            axios.get('/LedgerSetups/GetChartOfAccounts').then(response => {

                this.coaHierachyList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get chart of accounts.');

            });
        },

        getChartOfAccountControls() {

            axios.get('/LedgerSetups/GetChartOfAccountContols').then(response => {

                this.parseControlsHierachy(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get chart of account controls.');

            });


        },

        getChartOfAccountControlByAccountGroup() {

            if (this.selectedAccountGroupId)
            {
                axios.get('/LedgerSetups/GetChartOfAccountContolsByAccountGroup?id=' + this.selectedAccountGroupId).then(response => {

                    this.parseControlsHierachy(response.data);

                }).catch(err => {

                    this.toastHandler('error', 'Unable to get chart of account controls.');

                });

            }


        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "accountGroupId", headerText: "AccountGroupId", width: 75, visible: false, },
                    { field: "parentAccountHeaderId", headerText: "parentAccountHeaderId", width: 75, visible: false, },
                    { field: "accountControlHierachyName", headerText: "Account Control Hierachy Name", allowEditing: false, width: 150 },
                    { field: "accountHeaderName", headerText: "Account Header Name", validationRules: { required: true, minlength: 1 }, width: 85 },
                    { field: "minAccount", headerText: "Min. Account No.", editParams: { decimalPlaces: 0 }, width: 55 },
                    { field: "maxAccount", headerText: "Max. Account No.", editParams: { decimalPlaces: 0 }, width: 55 },
                    { field: "noOfAccounts", headerText: "No. Of Accounts", format: "{0:n0}", editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 0 }, allowEditing: false, width: 50 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],

                endEdit: (args) => {

                    this.updateCoaControl(args.data);
                },
                endDelete: (args) => {

                    this.delCoaControl(args.data.id);
                },
            });

        },

        saveCoaControl() {


            if (!this.selectedAccountGroupId) {

                this.toastHandler('warning', 'Select an account group');
                return;
            }

            let payload = {};
            payload.accountHeaderName = this.accountHeaderName;
            payload.minAccount = this.minAccount;
            payload.maxAccount = this.maxAccount;
            payload.accountGroupId = this.selectedAccountGroupId;
            payload.parentAccountHeaderId = this.parentAccountHeaderId;

            if (!this.parentAccountHeaderId)
            {
                payload.parentAccountHeaderId = this.emptyGuid;
            }


            axios.post('/LedgerSetups/CreateChartOfAccountContol', payload).then(response => {

                this.accountHeaderName = '';
                this.minAccount = null;
                this.maxAccount = null;

                this.getChartOfAccountControlByAccountGroup();

                this.toastHandler('', 'Account control saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save account control.');

            });
        },

        updateCoaControl(payload) {

            if (!payload.parentAccountHeaderId) {
                payload.parentAccountHeaderId = this.emptyGuid;
            }

            axios.post('/LedgerSetups/UpdateChartOfAccountContol', payload).then(response => {

                this.getChartOfAccountControlByAccountGroup();


                this.toastHandler('', 'Account control updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update account control.');

            });
        },

        delCoaControl(id) {

            axios.get('/LedgerSetups/DelChartOfAccountContol?id=' + id).then(response => {

                this.getChartOfAccountControlByAccountGroup();

                this.toastHandler('', 'Account control deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete account control.');

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

            this.coaHierachyList = coaHierachyList;

        },

        getHierachyName(id) {

            let parentId;
            let returnName;

            this.coaList.forEach(item => {

                if (item.id === id) {
                    parentId = item.parentId;
                    returnName = item.name;
                }

                this.coaList.forEach(cc => {
                    if (cc.id === parentId) {
                        return (`${this.getHierachyName(parentId)} / ${returnName}`);
                    }
                })

            });

            this.coaNameList.push(returnName);

        },

        //parse hierachy for controls

        getControlsHierachyName(id) {

            let parentId;
            let returnName;

            this.coaControlList.forEach(item => {

                if (item.id == id) {
                    parentId = item.parentAccountHeaderId;
                    returnName = item.accountHeaderName;
                }

                this.coaControlList.forEach(cc => {
                    if (cc.id == parentId) {
                        return (`${this.getControlsHierachyName(parentId)} / ${returnName}`);
                    }
                })

            });

            this.coaControlNameList.push(returnName);

        },

        parseControlsHierachy(dataArr) {

            this.coaControlList = dataArr;

            let coaControlHierachyList = [];

            for (let i = 0; i < this.coaControlList.length; i++) {

                this.getControlsHierachyName(this.coaControlList[i].id);

                let name = [...new Set(this.coaControlNameList)].join().replace(/,/g, '/');

                coaControlHierachyList.push({

                    accountControlHierachyName: name,
                    accountGroupId: this.coaControlList[i].accountGroupId,
                    minAccount: this.coaControlList[i].minAccount,
                    maxAccount: this.coaControlList[i].maxAccount,
                    noOfAccounts: this.coaControlList[i].maxAccount - this.coaControlList[i].minAccount,
                    parentAccountHeaderId: this.coaControlList[i].parentAccountHeaderId,
                    id: this.coaControlList[i].id,
                    accountHeaderName: this.coaControlList[i].accountHeaderName,
                    tenantId: this.coaControlList[i].tenantId,

                });

                name = [];

                this.coaControlNameList = [];

            }

            this.coaControlHierachyList = coaControlHierachyList;

            this.renderTable(coaControlHierachyList);
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

        this.getChartOfAccounts();

        this.getChartOfAccountControls();
    },
});