
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},
        allowanceRateList: [],
        emptyGuid: '00000000-0000-0000-0000-000000000000',

    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetAllowanceTypes').then(response => {
                
                this.allowanceRateList = [];

                response.data.allowanceTypes.forEach((allowanceType) => {

                    allowanceType.allowanceTypeId = allowanceType.id;
                    
                    allowanceType.allowanceRates.forEach((rate) => {
                        
                        this.allowanceRateList.push(rate);

                    })

                })

                this.renderTable(response.data);


            }).catch(err => {

                this.toastHandler('error', 'Unable to get allowance types.');

            });
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData.allowanceTypes,
                allowPaging: true,
                pageSettings: { pageSize: 10 },
                isResponsive: true,
                allowGrouping: true,
                allowSorting: true,
                enableDropAreaAnimation: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                columns: [

                    { field: "allowanceTypeId", isPrimaryKey: true, visible: false, headerText: "id", width: 15, },
                    { field: "name", headerText: 'Allowance Type', textAlign: ej.TextAlign.Left, width: 85 },
                    { field: "expenseAccountId", headerText: 'Expense GL', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "accountName", textAlign: ej.TextAlign.Left, width: 75, dataSource: responseData.accountDetails },
                    { field: "allowanceDays", headerText: 'Allowance Days', textAlign: ej.TextAlign.Left, width: 45 },
                    { field: "taxable", headerText: 'Taxable?', textAlign: ej.TextAlign.Center, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                actionComplete: (args) => {
                    
                    //this.setAllowanceDays();
                     
                },
                endAdd: (args) => {

                    this.saveAllowanceType(args.data);
                },
                endDelete: (args) => {

                    this.delAllowanceType(args.data.allowanceTypeId);
                },
                endEdit: (args) => {

                    this.editAllowanceType(args.data);
                },
                childGrid: {
                    dataSource: this.allowanceRateList,
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    endAdd: (args) => {

                        this.saveAllowanceRate(args.data)
                    },
                    endDelete: (args) => {

                        this.delAllowanceRate(args.data)
                    },
                    endEdit: (args) => {

                        this.editAllowanceRate(args.data)
                    },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                    queryString: "allowanceTypeId",
                    columns: [

                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                        { field: "allowanceTypeId", visible: false, headerText: "id", width: 'auto', },
                        { field: "employeeCategoryId", headerText: 'Employee Category', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left, width: 65, dataSource: responseData.employeeCategories },
                        { field: "fixedAmount", headerText: 'Fixed Amount', textAlign: ej.TextAlign.Center, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean' },
                        { field: "amount", headerText: 'Amount', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, range: [0.1, 100] } },
                        { field: "percentageBasic", headerText: '% of Basic', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, range: [0.1, 90000000000000000000000000000000000000000000000000000000000000000000000] } },
                        { field: "maximumAmount", headerText: 'Maximum Amount', textAlign: ej.TextAlign.Left, width: 50, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, range: [0.1, 900000000000000000000000000000000000000000000000000000000000000000000] } },
                        { field: "prorate", headerText: 'Prorate', textAlign: ej.TextAlign.Left, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },
                        { field: "applyBackpay", headerText: 'Apply Backpay', textAlign: ej.TextAlign.Left, width: 55, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },

                    ],
                    actionComplete: (args) => {

                        $("[name='Prorate']").ejCheckBox({});
                        $("[name='ApplyBackpay']").ejCheckBox({});
 
                        $("[name='fixedAmount']").ejCheckBox({
                            change: (args) => {

                                if (args.isChecked) {
                                    $("[name='percentageBasic']").ejNumericTextbox({ enabled: false, value: 0 });
                                    $("[name='maximumAmount']").ejNumericTextbox({ enabled: false, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: true, value: 0 });
                                }
                                else {
                                    $("[name='percentageBasic']").ejNumericTextbox({ enabled: true, value: 0 });
                                    $("[name='maximumAmount']").ejNumericTextbox({ enabled: true, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: false, value: 0 });
                                }
                            },
                            create: (args) => {

                                if (args.model.checked) {
                                    $("[name='percentageBasic']").ejNumericTextbox({ enabled: false, value: 0 });
                                    $("[name='maximumAmount']").ejNumericTextbox({ enabled: false, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: true, value: 0 });
                                }
                                else {
                                    $("[name='percentageBasic']").ejNumericTextbox({ enabled: true, value: 0 });
                                    $("[name='maximumAmount']").ejNumericTextbox({ enabled: true, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: false, value: 0 });
                                }
                            },
                            beforeChange: (args) => {

                                if (args.model.checked) {
                                    $("[name='percentageBasic']").ejNumericTextbox({ enabled: false, value: 0 });
                                    $("[name='maximumAmount']").ejNumericTextbox({ enabled: false, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: true, value: 0 });
                                }
                                else {
                                    $("[name='percentageBasic']").ejNumericTextbox({ enabled: true, value: 0 });
                                    $("[name='maximumAmount']").ejNumericTextbox({ enabled: true, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: false, value: 0 });
                                }
                            },
                        })
                    },
                },
            });

        },

        setAllowanceDays(){

            axios.get('/PayrollSetups/GetDefaultAllowanceDays').then(response => {

                if (response.data){
                    
                    $('[name="allowanceDays"]').val(response.data.days);
                }
                

            }).catch(err => {


            });
            
        },
        
        saveAllowanceType(payload) {

            delete payload.allowanceTypeId;
            delete payload.tenantId;

            if (!payload.expenseAccountId) {

                payload.expenseAccountId = this.emptyGuid;
            }
            
            if (!payload.allowanceDays){

                payload.allowanceDays = 0;
            }

            axios.post('/PayrollSetups/CreateAllowanceType', payload).then(response => {

                this.getSetupData();

                if (response.data.code === 200) {
                    
                    this.toastHandler('', 'Allowance type saved.');

                }
                else {
                    
                    this.toastHandler('error', response.data.message);

                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save allowance type.');

            });
        },

        editAllowanceType(payload) {

            payload.id = payload.allowanceTypeId;

            if (!payload.expenseAccountId) {

                payload.expenseAccountId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/UpdateAllowanceType', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Allowance type updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update allowance type.');

            });
        },

        delAllowanceType(id) {

            axios.get('/PayrollSetups/DelAllowanceType?id=' + id).then(response => {

                if(response.data.code !== 200)
                {
                    this.toastHandler('error', 'Allowance type cant be deleted.');
                    
                    this.toastHandler('error', 'Allowance type has been referenced in other records.');
                }
                else 
                {
                    this.toastHandler('', 'Allowance type deleted.');
                }

                this.getSetupData();
                

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete allowance type.');

            });
        },

        //allowance rate..

        saveAllowanceRate(payload) {

            payload.id = this.uuid();

            if (!payload.employeeCategoryId) {

                payload.employeeCategoryId = this.emptyGuid;
            }

            this.allowanceRateList.push(payload);

            axios.post('/PayrollSetups/CreateAllowanceRate', payload).then(response => {

                 
                if (response.data.code === 200) {
                    this.toastHandler('', 'Allowance rate saved.');

                }
                else {
                    this.toastHandler('error', response.data.message);

                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save allowance rate.');

            });
        },

        editAllowanceRate(payload) {

            if (!payload.employeeCategoryId) {

                payload.employeeCategoryId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/UpdateAllowanceRate', payload).then(response => {
 

                this.toastHandler('', 'Allowance rate updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update allowance rate.');

            });
        },

        delAllowanceRate(payload) {

            axios.post('/PayrollSetups/DelAllowanceRate', payload).then(response => {
 
                this.toastHandler('', 'Allowance rate deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete allowance rate.');

            });
        },

        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        toastHandler(type, message = 'An unexpected error occurred.') {

            //display alert with 
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 12000,
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