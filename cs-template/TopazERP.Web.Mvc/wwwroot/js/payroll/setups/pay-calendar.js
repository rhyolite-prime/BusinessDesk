
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},
        payCalendarParentData: [],
        payCalendarDetails: [],
        monthsData : [
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
        ],

    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetPayCalendars').then(response => {

                this.payCalendarDetails = [];
                
                response.data.forEach((payCalendar) => {

                    payCalendar.payCalendarId = payCalendar.id;

                    payCalendar.payCalendarDetails.forEach((payCalendarDetail) => {

                        this.payCalendarDetails.push(payCalendarDetail);

                    })

                })

                this.renderTable(response.data);
                this.payCalendarParentData = response.data;

            }).catch(err => {

                console.log(err)
                this.toastHandler('error', 'Unable to get pay calendar.');

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

                    { field: "payCalendarId", isPrimaryKey: true, visible: false, headerText: "id", width: 15, },
                    { field: "year", validationRules: { required: true, minlength: 1 }, headerText: "Year", width: 120, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.savePayCalendar(args.data);
                },
                endDelete: (args) => {

                    this.delPayCalendar(args.data.id);
                },
                endEdit: (args) => {

                    this.editPayCalendar(args.data);
                },
                childGrid: {

                    dataSource: this.payCalendarDetails.sort((a, b) => a.month - b.month),
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    endAdd: (args) => {

                        this.savePayCalendarDetails(args.data)
                    },
                    endDelete: (args) => {

                        this.delPayCalendarDetails(args.data)
                    },
                    endEdit: (args) => {

                        this.editPayCalendarDetails(args.data)
                    },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                    queryString: "payCalendarId",
                    columns: [

                        { field: "id", visible: false, isPrimaryKey: true,headerText: "id", width: 'auto', },
                        { field: "payCalendarId", visible: false, headerText: "id", width: 'auto', },
                        { field: "year", headerText: "id", visible: false, width: 75, },
                        { field: "month", headerText: "Month", editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "MonthId", foreignKeyValue: "MonthName", textAlign: ej.TextAlign.Left, width: 75, dataSource: this.monthsData },
                        { field: "days", headerText: 'Days', textAlign: ej.TextAlign.Left, width: 55, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 0 }, format: "{0:n0}", validationRules: { required: true, } },

                    ],
                    
                },
            });

        },

        savePayCalendar(payload) {

            delete payload.tenantId;
 
            axios.post('/PayrollSetups/CreatePayCalendar', payload).then(response => {

                this.getSetupData();
                
                this.toastHandler('', 'Pay calendar saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save pay calendar.');

            });
        },

        editPayCalendar(payload) {


            axios.post('/PayrollSetups/UpdatePayCalendar', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Pay calendar updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update pay calendar.');

            });
        },

        delPayCalendar(id) {

            axios.get('/PayrollSetups/DelPayCalendar?id=' + id).then(response => {

                this.toastHandler('', 'Pay calendar deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete pay calendar.');

            });
        },

        //Pay calendar details...

        savePayCalendarDetails(payload) {

            payload.id = this.uuid();
            
            //push Pay calendar details to client side list and maintain state
            
            this.payCalendarDetails.push(payload);

            axios.post('/PayrollSetups/CreatePayCalendarDetails', payload).then(response => {

             
                if (response.data.code === 200) {

                    this.toastHandler('', 'Pay calendar details saved.');

                }
                else {
                    this.toastHandler('error', response.data.message);

                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save pay calendar details.');

            });
        },

        editPayCalendarDetails(payload) {

            if (!payload.year){
                
                let payCalendarInfo =  this.payCalendarParentData.find(a=> a.id === payload.payCalendarId);
                 
                if(payCalendarInfo){
                    payload.year = payCalendarInfo.year;
                        
                }
            }
            
            axios.post('/PayrollSetups/UpdatePayCalendarDetails', payload).then(response => {
                
                this.toastHandler('', 'Pay calendar details updated.');
                
            }).catch(err => {

                this.toastHandler('error', 'Unable to update pay calendar details.');

            });
        },

        delPayCalendarDetails(payload) {

            axios.post('/PayrollSetups/DelPayCalendarDetails', payload).then(response => {

                this.toastHandler('', 'Pay calendar details deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete pay calendar details.');

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