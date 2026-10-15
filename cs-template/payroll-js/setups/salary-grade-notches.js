
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},
        salaryNotchList: [],
        emptyGuid: '00000000-0000-0000-0000-000000000000',

    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetSalaryGrades').then(response => {
                

                response.data.forEach((salaryGrade) => {

                    salaryGrade.salaryGradeId = salaryGrade.id;
                    
                    salaryGrade.salaryNotches.forEach((notch) => {
                        
                        this.salaryNotchList.push(notch);

                    })

                })

                this.renderTable(response.data);


            }).catch(err => {

                console.log(err)
                this.toastHandler('error', 'Unable to get salary grades & notches.');

            });
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                pageSettings: { pageSize: 10 },
                isResponsive: true,
                allowGrouping: true,
                allowSorting: true,
                enableDropAreaAnimation: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                columns: [

                    { field: "salaryGradeId", isPrimaryKey: true, visible: false, headerText: "id", width: 15, },
                    { field: "name", headerText: 'Salary Grade', textAlign: ej.TextAlign.Left, width: 85 },
                    { field: "numericalOrder", headerText: 'Numerical Order', textAlign: ej.TextAlign.Left, width: 55, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 0 }, format: "{0:n0}", validationRules: { required: true, } },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveSalaryGrade(args.data);
                },
                endDelete: (args) => {

                    this.delSalaryGrade(args.data.salaryGradeId);
                },
                endEdit: (args) => {

                    this.editSalaryGrade(args.data);
                },
                childGrid: {
                    dataSource: this.salaryNotchList,
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    endAdd: (args) => {

                        this.saveSalaryNotch(args.data)
                    },
                    endDelete: (args) => {

                        this.delSalaryNotch(args.data)
                    },
                    endEdit: (args) => {

                        this.editSalaryNotch(args.data)
                    },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                    queryString: "salaryGradeId",
                    columns: [

                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                        { field: "salaryGradeId", visible: false, headerText: "id", width: 'auto', },
                        { field: "notch", headerText: "Notch", width: 65, },
                        { field: "salary", headerText: 'Salary', width: 55, textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 1, } },
                        { field: "numericalOrder", headerText: 'Numerical Order', textAlign: ej.TextAlign.Left, width: 55, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 0 }, format: "{0:n0}", validationRules: { required: true, } },

                    ],
                },
            });

        },

        saveSalaryGrade(payload) {

            delete payload.salaryGradeId;
            delete payload.tenantId;


            axios.post('/PayrollSetups/CreateSalaryGrade', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Salary grade saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save salary grade.');

            });
        },

        editSalaryGrade(payload) {

            payload.id = payload.salaryGradeId;

            axios.post('/PayrollSetups/UpdateSalaryGrade', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Salary grade updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update salary grade.');

            });
        },

        delSalaryGrade(id) {

            axios.get('/PayrollSetups/DelSalaryGrade?id=' + id).then(response => {

                if(response.data.code !== 200)
                {
                    this.toastHandler('error', 'Salary grade cant be deleted.');

                    this.toastHandler('error', 'Salary grade has been referenced in other records.');
                }
                else
                {
                    this.toastHandler('', 'Salary grade deleted.');
                }
                
                this.getSetupData();


            }).catch(err => {

                this.toastHandler('error', 'Unable to delete salary grade.');

            });
        },

        //salary notch..

        saveSalaryNotch(payload) {

            payload.id = this.uuid();

            axios.post('/PayrollSetups/CreateSalaryNotch', payload).then(response => {

                //this.getSetupData();

                this.toastHandler('', 'Salary Notch saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save salary notch.');

            });
        },

        editSalaryNotch(payload) {
 
            axios.post('/PayrollSetups/UpdateSalaryNotch', payload).then(response => {

                //this.getSetupData();

                this.toastHandler('', 'Salary notch updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update salary notch.');

            });
        },

        delSalaryNotch(payload) {

            axios.post('/PayrollSetups/DelSalaryNotch', payload).then(response => {

                //this.getSetupData();

                this.toastHandler('', 'Salary notch deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete salary notch.');

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

    },
});