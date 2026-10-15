
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},
        bikRateList: [],
        emptyGuid: '00000000-0000-0000-0000-000000000000',


    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetBikTypes').then(response => {

                this.bikRateList = [];

                response.data.bikTypes.forEach((bikType) => {

                    bikType.bikTypeId = bikType.id;
                    
                    bikType.bikRates.forEach((rate) => {
                        
                        this.bikRateList.push(rate);

                    })

                })

                this.renderTable(response.data);


            }).catch(err => {

                console.log(err)
                this.toastHandler('error', 'Unable to get allowance types.');

            });
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData.bikTypes,
                allowPaging: true,
                pageSettings: { pageSize: 10 },
                isResponsive: true,
                allowGrouping: true,
                allowSorting: true,
                enableDropAreaAnimation: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                columns: [

                    { field: "bikTypeId", isPrimaryKey: true, visible: false, headerText: "id", width: 15, },
                    { field: "name", headerText: 'Benefit in Kind Type', textAlign: ej.TextAlign.Left, width: 85 },
                    { field: "expenseAccountId", headerText: 'Expense GL', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "accountName", textAlign: ej.TextAlign.Left, width: 75, dataSource: responseData.accountDetails },
                    { field: "taxable", headerText: 'Taxable ?', textAlign: ej.TextAlign.Center, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveBikType(args.data);
                },
                endDelete: (args) => {

                    this.delBikType(args.data.bikTypeId);
                },
                endEdit: (args) => {

                    this.editBikType(args.data);
                },
                childGrid: {
                    dataSource: this.bikRateList,
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    endAdd: (args) => {

                        this.saveBikRate(args.data)
                    },
                    endDelete: (args) => {

                        this.delBikRate(args.data)
                    },
                    endEdit: (args) => {

                        this.editBikRate(args.data)
                    },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                    queryString: "bikTypeId",
                    columns: [

                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                        { field: "bikTypeId", visible: false, headerText: "id", width: 'auto', },
                        { field: "employeeCategoryId", headerText: 'Employee Category', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left, width: 65, dataSource: responseData.employeeCategories },
                        { field: "allowanceTypeId", headerText: 'Allowance Type', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left, width: 65, dataSource: responseData.allowanceTypes },
                        { field: "fixedAmount", headerText: 'Fixed Amount', textAlign: ej.TextAlign.Center, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean' },
                        { field: "amount", headerText: 'Amount', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, range: [0.1, 100] } },
                        { field: "percentageBasic", headerText: '% of Basic', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, range: [0.1, 90000000000000000000000000000000000000000000000000000] } },
                        { field: "maximumAmount", headerText: 'Maximum Amount', textAlign: ej.TextAlign.Left, width: 50, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, range: [0.1, 900000000000000000000000000000000000000000000000000] } },
                    ],
                    actionComplete: (args) => {

                        $("[name='Prorate']").ejCheckBox({});

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

        saveBikType(payload) {

            delete payload.bikTypeId;
            delete payload.tenantId;

            if (!payload.expenseAccountId) {

                payload.expenseAccountId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/CreateBikType', payload).then(response => {

                this.getSetupData();

                if (response.data.code === 200) {
                    this.toastHandler('', 'Benefits in kind type saved.');

                }
                else {
                    this.toastHandler('error', response.data.message);

                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save benefits in kind type.');

            });
        },

        editBikType(payload) {

            payload.id = payload.bikTypeId;

            if (!payload.expenseAccountId) {

                payload.expenseAccountId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/UpdateBikType', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Benefits in kind type updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update benefits in kind type.');

            });
        },

        delBikType(id) {

            axios.get('/PayrollSetups/DelBikType?id=' + id).then(response => {

                if(response.data.code !== 200)
                {
                    this.toastHandler('error', 'Benefits in kind type cant be deleted.');

                    this.toastHandler('error', 'Benefits in kind type has been referenced in other records.');
                }
                else
                {
                    this.toastHandler('', 'Benefits in kind type deleted.');
                    
                }

                this.getSetupData();
                

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete benefits in kind type.');

            });
        },

        //bik rate ...

        saveBikRate(payload) {

            payload.id = this.uuid();

            if (!payload.employeeCategoryId) {

                payload.employeeCategoryId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/CreateBikRate', payload).then(response => {

                this.getSetupData();

                if (response.data.code === 200) {

                    this.toastHandler('', 'Benefits in kind rate saved.');
                }
                else {

                    this.toastHandler('error', response.data.message);
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save benefits in kind rate.');

            });
        },

        editBikRate(payload) {

            if (!payload.employeeCategoryId) {

                payload.employeeCategoryId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/UpdateBikRate', payload).then(response => {

                //this.getSetupData();

                this.toastHandler('', 'Benefits in kind rate updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update benefits in kind rates.');

            });
        },

        delBikRate(payload) {

            axios.post('/PayrollSetups/DelBikRate', payload).then(response => {

                //this.getSetupData();

                this.toastHandler('', 'Benefits in kind rate deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete benefits in kind rate.');

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

        $('input[type=checkbox][name=fixedAmount]').change(

            () => {
                if (this.checked) {

                    alert('checked');
                }
            });

    },
});