
let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},
        budgetList: [],
        budgetDetailList: [],
        costCenterNameList: [],
        monthsList: [

            {
                MonthId: 1,
                MonthName: 'January'
            },
            {
                MonthId: 2,
                MonthName: 'February'
            },
            {
                MonthId: 3,
                MonthName: 'March'
            },
            {
                MonthId: 4,
                MonthName: 'April'
            },
            {
                MonthId: 5,
                MonthName: 'May'
            },
            {
                MonthId: 6,
                MonthName: 'June'
            },
            {
                MonthId: 7,
                MonthName: 'July'
            },
            {
                MonthId: 8,
                MonthName: 'August'
            },
            {
                MonthId: 9,
                MonthName: 'September'
            },
            {
                MonthId: 10,
                MonthName: 'October'
            },
            {
                MonthId: 11,
                MonthName: 'November'
            },
            {
                MonthId: 12,
                MonthName: 'December'
            }
        ]

    },

    methods: {

        getData() {

            axios.get('/LedgerDataEntry/GetBudget').then(response => {

                this.budgetDetailList = [];

                this.costCenterList = response.data.costCenters;

                response.data.budgets.forEach((budget) => {

                    budget.budgetId = budget.id;
                    budget.beginDate = moment(budget.beginDate).format("DD-MMM-YYYY");
                    budget.endDate = moment(budget.endDate).format("DD-MMM-YYYY");

                    budget.budgetDetails.forEach((budgetDetails) => {

                        budgetDetails.budgetId = budget.id;
                        this.budgetDetailList.push(budgetDetails);

                    })

                });

                response.data.accounts.forEach((v) => {

                    v.accountIdentifier = `${v.accountNo} - ${v.accountName}`;

                });

                let costCenterHierachyList = this.parseCostCenterHierachy(response.data.costCenters);

                this.renderTable(response.data.budgets, this.budgetDetailList, response.data.accounts, costCenterHierachyList);

            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve budgets');

            });
        },


        renderTable(budgetList, budgetDetailList, accounts, costCenters) {

            let dt = new Date();

            $("#dataTable").ejGrid({

                dataSource: budgetList,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 15, },
                    { field: "budgetId", visible: false, headerText: "budgetId", width: 15, },
                    { field: "accountId", headerText: 'Account Name', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "accountIdentifier", textAlign: ej.TextAlign.Left, width: 85, dataSource: accounts },
                    { field: "ouId", headerText: 'Organizational Unit', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left, width: 85, dataSource: costCenters  },
                    { field: "beginDate", headerText: "Start Date", width: 65, format: "{0:dd-MMM-yyyy}", validationRules: { date: true }, editType: ej.Grid.EditingType.DatePicker, textAlign: ej.TextAlign.Left },
                    { field: "endDate", headerText: "End Date", width: 65, format: "{0:dd-MMM-yyyy}", validationRules: { date: true }, editType: ej.Grid.EditingType.DatePicker, textAlign: ej.TextAlign.Left },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: ( args )=>
                {
                    this.saveBudgetHeader( args.data );
                },
                endDelete: ( args ) =>
                {
                    this.delBudgetHeader( args.data.id );
                },
                endEdit: (args) => {

                    this.editBudgetHeader(args.data);
                },
                childGrid: {
                    dataSource: budgetDetailList,
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    endAdd: ( args ) =>
                    {
                        this.addBudgetDetail( args.data )
                    },
                    endDelete: ( args ) =>
                    {
                        this.deleteBudgetDetail( args.data)
                    },
                    endEdit: ( args ) =>
                    {
                        this.editBudgetDetail( args.data )
                    },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search, ] },
                    queryString: "budgetId",
                    columns: [
                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 10, },
                        { field: "budgetId", visible: false, headerText: "id", width: 10, },
                        { field: "month", headerText: "Month", editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "MonthId", foreignKeyValue: "MonthName", textAlign: ej.TextAlign.Left, width: 65, dataSource: this.monthsList },
                        { field: "year", headerText: 'Year', textAlign: ej.TextAlign.Left, width: 55, defaultValue: dt.getFullYear(), editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 0 }, format: "{0:n0}", validationRules: { required: true, } },
                        { field: "revisedAmount", headerText: 'Revised Amount', textAlign: ej.TextAlign.Left, width: 75, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, } },
                        { field: "budgetAmount", headerText: 'Budget Amount', textAlign: ej.TextAlign.Left, width: 75, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, } },
                        { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                    ],

                },
            });

        },

        saveBudgetHeader(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/LedgerDataEntry/CreateBudget', payload).then(response => {

                this.getData();

                this.toastHandler('', 'Budget saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save budget.');

            });
        },

        editBudgetHeader(payload) {

            axios.post('/LedgerDataEntry/UpdateBudget', payload).then(response => {

                this.getData();

                this.toastHandler('', 'Budget updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update budget.');

            });
        },

        delBudgetHeader(id) {

            axios.get('/LedgerDataEntry/DelBudget?id=' + id).then(response => {

                this.getData();

                this.toastHandler('', 'Budget deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete budget.');

            });
        },

        addBudgetDetail(payload){

            payload.id = this.uuid();

            axios.post('/LedgerDataEntry/CreateBudgetDetail', payload).then(response => {

                this.getData();

                if (response.data.code === 200) {
                    this.toastHandler('', 'Budget detail saved.');

                }
                else {

                    this.toastHandler('error', response.data.message);
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save budget details.');

            });
        },

        deleteBudgetDetail(payload){

            axios.post('/LedgerDataEntry/DeleteBudgetDetail', payload).then(response => {


                this.toastHandler('', 'Budget detail deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete budget details.');

            });

        },

        editBudgetDetail(payload){

            axios.post('/LedgerDataEntry/UpdateBudgetDetail', payload).then(response => {


                this.toastHandler('', 'Budget detail updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update budget details.');

            });

        },

        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        parseCostCenterHierachy(dataArr) {

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

            return costCenterHierachyList;

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

        this.getData();

    },
});