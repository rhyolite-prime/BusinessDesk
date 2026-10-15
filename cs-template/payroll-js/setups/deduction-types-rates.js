
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},
        deductionRateList: [],
        emptyGuid: '00000000-0000-0000-0000-000000000000',


    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetDeductionTypes').then(response => {
                
                this.deductionRateList = [];

                response.data.deductionTypes.forEach((deductionType) => {

                    deductionType.deductionTypeId = deductionType.id;
                    
                    deductionType.rates.forEach((rate) => {
                        
                        this.deductionRateList.push(rate);

                    })

                })

                this.renderTable(response.data);


            }).catch(err => {

                console.log(err)
                this.toastHandler('error', 'Unable to get deduction types.');

            });
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData.deductionTypes,
                allowPaging: true,
                pageSettings: { pageSize: 10 },
                isResponsive: true,
                allowGrouping: true,
                allowSorting: true,
                enableDropAreaAnimation: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                columns: [

                    { field: "deductionTypeId", isPrimaryKey: true, visible: false, headerText: "id", width: 15, },
                    { field: "name", headerText: 'Deduction Type', textAlign: ej.TextAlign.Left, width: 85 },
                    { field: "accountId", headerText: 'GL Account', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "accountName", textAlign: ej.TextAlign.Left, width: 75, dataSource: responseData.accountDetails },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveDeductionType(args.data);
                },
                endDelete: (args) => {

                    this.delDeductionType(args.data.deductionTypeId);
                },
                endEdit: (args) => {

                    this.editDeductionType(args.data);
                },
                childGrid: {
                    dataSource: this.deductionRateList,
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    endAdd: (args) => {

                        this.saveDeductionRate(args.data)
                    },
                    endDelete: (args) => {

                        this.delDeductionRate(args.data)
                    },
                    endEdit: (args) => {

                        this.editDeductionRate(args.data)
                    },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                    queryString: "deductionTypeId",
                    columns: [

                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                        { field: "deductionTypeId", visible: false, headerText: "id", width: 'auto', },
                        { field: "employeeCategoryId", headerText: 'Employee Category', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left, width: 65, dataSource: responseData.employeeCategories },
                        { field: "fixedAmount", headerText: 'Fixed Amount', textAlign: ej.TextAlign.Center, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean' },
                        { field: "amount", headerText: 'Amount', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, range: [0.1, 100] } },
                        { field: "percentageBasic", headerText: '% of Basic', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, range: [0.1, 90000000000000000000000000000000000000000000000000000000000000000000000] } },
                        { field: "maximumAmount", headerText: 'Maximum Amount', textAlign: ej.TextAlign.Left, width: 50, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, range: [0.1, 900000000000000000000000000000000000000000000000000000000000000000000] } },
                        { field: "prorate", headerText: 'Prorate', textAlign: ej.TextAlign.Left, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },

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

        saveDeductionType(payload) {

            delete payload.deductionTypeId;
            delete payload.tenantId;

            if (!payload.accountId) {

                payload.accountId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/CreateDeductionType', payload).then(response => {

                this.getSetupData();

                if (response.data.code === 200) {

                    this.toastHandler('', 'Deduction type saved.');

                }
                else {

                    this.toastHandler('error', response.data.message);
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save deduction type.');

            });
        },

        editDeductionType(payload) {

            payload.id = payload.deductionTypeId;

            if (!payload.accountId) {

                payload.accountId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/UpdateDeductionType', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Deduction type updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update deduction type.');

            });
        },

        delDeductionType(id) {

            axios.get('/PayrollSetups/DelDeductionType?id=' + id).then(response => {

                if(response.data.code !== 200)
                {
                    this.toastHandler('error', 'Deduction type cant be deleted.');

                    this.toastHandler('error', 'Deduction type has been referenced in other records.');
                }
                else
                {
                    this.toastHandler('', 'Deduction type deleted.');
                }
                
                this.getSetupData();

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete deduction type.');

            });
        },

        //deduction rate..

        saveDeductionRate(payload) {

            payload.id = this.uuid();

            if (!payload.employeeCategoryId) {

                payload.employeeCategoryId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/CreateDeductionRate', payload).then(response => {

                this.getSetupData();

                if (response.data.code === 200) {

                    this.toastHandler('', 'Deduction rate saved.');
                }
                else {

                    this.toastHandler('error', response.data.message);
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save deduction rate.');

            });
        },

        editDeductionRate(payload) {

            if (!payload.employeeCategoryId) {

                payload.employeeCategoryId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/UpdateDeductionRate', payload).then(response => {

                //this.getSetupData();

                this.toastHandler('', 'Deduction rate updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update deduction rate.');

            });
        },

        delDeductionRate(payload) {

            axios.post('/PayrollSetups/DelDeductionRate', payload).then(response => {

                //this.getSetupData();

                this.toastHandler('', 'Deduction rate deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete deduction rate.');

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