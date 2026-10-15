
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},
        overtimeRateList: [],
        emptyGuid: '00000000-0000-0000-0000-000000000000',


    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetOvertimeTypes').then(response => {

                this.overtimeRateList = [];

                response.data.overtimeTypes.forEach((overtimeType) => {

                    overtimeType.overtimeTypeId = overtimeType.id;
                    
                    overtimeType.rates.forEach((rate) => {
                        
                        this.overtimeRateList.push(rate);
                    })

                })

                this.renderTable(response.data);


            }).catch(err => {

                console.log(err)
                this.toastHandler('error', 'Unable to get overtime types.');

            });
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData.overtimeTypes,
                allowPaging: true,
                pageSettings: { pageSize: 10 },
                isResponsive: true,
                allowGrouping: true,
                allowSorting: true,
                enableDropAreaAnimation: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                columns: [

                    { field: "overtimeTypeId", isPrimaryKey: true, visible: false, headerText: "id", width: 15, },
                    { field: "name", headerText: 'Overtime Type', textAlign: ej.TextAlign.Left, width: 85 },
                    { field: "taxable", headerText: 'Taxable ?', textAlign: ej.TextAlign.Center, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },
                ],
                endAdd: (args) => {

                    this.saveOvertimeType(args.data);
                },
                endDelete: (args) => {

                    this.delOvertimeType(args.data.overtimeTypeId);
                },
                endEdit: (args) => {

                    this.editOvertimeType(args.data);
                },
                childGrid: {
                    dataSource: this.overtimeRateList,
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    endAdd: (args) => {

                        this.saveOvertimeRate(args.data)
                    },
                    endDelete: (args) => {

                        this.delOvertimeRate(args.data)
                    },
                    endEdit: (args) => {

                        this.editOvertimeRate(args.data)
                    },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                    queryString: "overtimeTypeId",
                    columns: [

                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                        { field: "overtimeTypeId", visible: false, headerText: "id", width: 'auto', },
                        { field: "employeeCategoryId", headerText: 'Employee Category', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left, width: 65, dataSource: responseData.employeeCategories },
                        { field: "fixedAmount", headerText: 'Fixed Amount', textAlign: ej.TextAlign.Center, width: 55, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean' },
                        { field: "amount", headerText: 'Amount', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, min: 0, } },
                        { field: "percentageBasic", headerText: '% of Basic', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0, max: 100.00 } },
                        { field: "percentageLimitOfBasic", headerText: '% Limit of Basic', textAlign: ej.TextAlign.Left, width: 55, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0, max: 100.00 } },
                        { field: "maximumAmount", headerText: 'Maximum Amount', textAlign: ej.TextAlign.Left, width: 50, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0 } },
                        { field: "annualHours", headerText: 'Annual Hours', textAlign: ej.TextAlign.Left, width: 50, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0 } },
                        { field: "isFactor", headerText: 'Is Factor', textAlign: ej.TextAlign.Left, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },
                        { field: "factor", headerText: 'Factor', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0 } },

                    ],
                    actionComplete: (args) => {

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

        saveOvertimeType(payload) {

            delete payload.overtimeTypeId;
            delete payload.tenantId;


            axios.post('/PayrollSetups/CreateOvertime', payload).then(response => {

                this.getSetupData();

                if (response.data.code == 200) {

                    this.toastHandler('', 'Overtime type saved.');

                }
                else {

                    this.toastHandler('error', response.data.message);
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save overtime type.');

            });
        },

        editOvertimeType(payload) {

            payload.id = payload.overtimeTypeId;

            axios.post('/PayrollSetups/UpdateOvertime', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Overtime type updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update overtime type.');

            });
        },

        delOvertimeType(id) {

            axios.get('/PayrollSetups/DelOvertime?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Overtime type deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete allowance type.');

            });
        },

        //overtime rate..

        saveOvertimeRate(payload) {

            payload.id = this.uuid();

            if (!payload.employeeCategoryId) {

                payload.employeeCategoryId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/CreateOvertimeRate', payload).then(response => {

                //this.getSetupData();

                this.toastHandler('', 'Overtime rate saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save overtime rate.');

            });
        },

        editOvertimeRate(payload) {

            if (!payload.employeeCategoryId) {

                payload.employeeCategoryId = this.emptyGuid;
            }

            axios.post('/PayrollSetups/UpdateOvertimeRate', payload).then(response => {

                //this.getSetupData();

                this.toastHandler('', 'Overtime rate updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update overtime rate.');

            });
        },

        delOvertimeRate(payload) {

            axios.post('/PayrollSetups/DelOvertimeRate', payload).then(response => {

                //this.getSetupData();

                this.toastHandler('', 'Overtime rate deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete overtime rate.');

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