
let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        accountList: [],
        accountNameList: [],
        accountHierachyList: [],
        coaControlList: [],
        coaControlNameList: [],
        coaControlHierachyList: [],
        accountControlList: [],
        name: '',
        parentId: '',
        statusList: [{ "id": 'Active', "name": "Active", }, { "id": "Inactive", "name": "Inactive" }],


    },
    methods: {

        getSetupData() {

            axios.get('/LedgerSetups/GetChartOfAccountDetails').then(response => {

                this.accountControlList = response.data.accountControls;
                let accountControls = this.parseControlsHierachy(response.data.accountControls);
                console.log('accountControls =>', response.data.accountControls);

                response.data.accountControls = accountControls;

                this.renderTable(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get chart of accounts.');

            });
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData.accountDetails,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowAdding: true, allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "accountName", headerText: "Account Name", validationRules: { required: true, minlength: 1 }, width: 75 },
                    { field: "accountNo", headerText: "Account No.", validationRules: { required: true, minlength: 1 }, width: 40 },
                    { field: "status", headerText: 'Status', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left, width: 45, dataSource: this.statusList },
                    { field: "accountHeaderId", headerText: 'Account Head/Source', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "accountControlHierachyName", textAlign: ej.TextAlign.Left, width: 125, dataSource: responseData.accountControls },
                    { field: "currencyId", headerText: 'Currency', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "currencyName", textAlign: ej.TextAlign.Left, width: 65, dataSource: responseData.currency },
                    { field: "currentBalance", visible: false, headerText: "currentBalance", width: 15, },
                    { field: "currentForeignBalance", visible: false, headerText: "currentForeignBalance", width: 15, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.addCoaDetail(args.data);
                },
                endEdit: (args) => {

                    this.updateCoaDetail(args.data);
                },
                endDelete: (args) => {

                    this.delCoaDetail(args.data.id);
                },
            });

        },

        addCoaDetail(payload) {

            delete payload.id;
            delete payload.tenantId;

            if (!payload.accountNo) {

                this.toastHandler('warning', 'Account No required.');

                this.getSetupData();

                return;
            }

            if (!payload.accountHeaderId) {

                this.toastHandler('warning', 'Select account head or source.');

                this.getSetupData();

                return;
            }

            let accountControlInfo = this.accountControlList.find(a=> a.id === payload.accountHeaderId);
            payload.currentBalance = 0;
            payload.currentForeignBalance = 0;
            if(accountControlInfo)
            {
                payload.accountHeaderName = accountControlInfo.name;
            }

            if (!payload.status) {

                payload.status = 'Active';

            }


            if (!payload.currencyId) {

                payload.currencyId = this.emptyGuid;

            }

            axios.post('/LedgerSetups/CreateChartOfAccountDetail', payload).then(response => {

                if (response.data.code === 200) {

                    this.toastHandler('', 'Account detail saved.');
                    this.getSetupData();
                    return;
                }


                this.getSetupData();
                this.toastHandler('warning', response.data.message);
               

            }).catch(err => {

                this.toastHandler('error', 'Unable to save account detail.');

            });

        },

        updateCoaDetail(payload) {


            if (!payload.accountNo) {

                this.toastHandler('warning', 'Account No required.');

                this.getSetupData();

                return;
            }

            if (!payload.accountHeaderId) {

                this.toastHandler('warning', 'Select account head or source.');

                this.getSetupData();

                return;
            }

            if (!payload.status) {

                payload.status = 'Active';
            }


            if (!payload.currencyId) {

                payload.currencyId = this.emptyGuid;

            }

            payload.currentBalance = 0;
            payload.currentForeignBalance = 0;

            axios.post('/LedgerSetups/UpdateChartOfAccountDetail', payload).then(response => {

                if (response.data.code === 200) {

                    this.toastHandler('', 'Account detail updated.');
                    this.getSetupData();
                    return;
                }
                
                this.getSetupData();

                this.toastHandler('warning', response.data.message);

            }).catch(err => {

                this.toastHandler('error', 'Unable to update account detail.');

            });
        },

        delCoaDetail(id) {

            axios.get('/LedgerSetups/DelChartOfAccountDetail?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Account detail deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete account detail.');

            });
        },

        getControlsHierachyName(id) {

            let parentId;
            let returnName;

            this.coaControlList.forEach(item => {

                if (item.id === id) {
                    parentId = item.parentAccountHeaderId;
                    returnName = item.accountHeaderName;
                }

                this.coaControlList.forEach(cc => {
                    if (cc.id === parentId) {
                        return (`${this.getControlsHierachyName(parentId)} / ${returnName}`);
                    }
                })

            });

            this.coaControlNameList.push(returnName);

        },

        parseControlsHierachy(dataArr) {

            this.coaControlList = dataArr;

            var coaControlHierachyList = [];

            for (var i = 0; i < this.coaControlList.length; i++) {

                this.getControlsHierachyName(this.coaControlList[i].id);

                var name = [...new Set(this.coaControlNameList)].join().replace(/,/g, '/');

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

            return coaControlHierachyList;

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