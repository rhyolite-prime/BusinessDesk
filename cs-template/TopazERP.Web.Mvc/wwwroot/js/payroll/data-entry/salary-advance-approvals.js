 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        approvalType: 'approve',
        employeeLoanList: [],
        selectedSalaryAdvanceList: [],

    },
    
    methods: {
         
        getPendingSalaryAdvance() {

            axios.get('/PayrollDataEntry/GetPendingSalaryAdvance').then(response => {

                response.data.forEach((v) => {

                    v.loanDate = this.formatDate(v.loanDate);
                    
                });
                 
                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to fetch pending salary advance.');

            });
        },
         
        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 20, },
                    { field: "employeeIdentifier", headerText: "Employee ID", validationRules: { required: true, minlength: 1 }, width: 50, },
                    { field: "employeeName", headerText: "Employee Name", validationRules: { required: true, minlength: 1 }, width: 105, },
                    { field: "loanTypeName", headerText: "Loan Type", format: "{0:n2}", width: 75, },
                    { field: "loanDate", headerText: "Loan Date", width: 55, },
                    { field: "amount", headerText: "Amount", format: "{0:n2}", width: 45, },
                ],
                recordDoubleClick: (args) => {
                    
                    //navigate to edit page
                    window.location.href = `/PayrollDataEntry/EditSalaryAdvance?id=${args.data.id}`;
                },
                 

            });

        },

        manageApproval() {

            this.getSelectedSalaryAdvance();

            let payload = {};
             
            if (!this.selectedSalaryAdvanceList.length) {

                this.toastHandler('warning', 'Selected a loan for approval.');

                return;

            }

            this.isLoading = true;

            payload.ids = this.selectedSalaryAdvanceList.map(a => a.id);
            payload.approvalType = this.approvalType;

            axios.post('/PayrollDataEntry/ApproveEmployeeSalaryAdvance', payload).then(response => {
                
                this.toastHandler('', 'Salary advance approved.');
                this.isLoading = false;
                this.getPendingSalaryAdvance();


            }).catch(err => {
                
                this.toastHandler('error', 'Unable to approve loan status');
                this.isLoading = false;

            });

        },

        getSelectedSalaryAdvance() {

            let obj = $("#dataTable").ejGrid("instance"), rec = []; this.selectedSalaryAdvanceList = [];
            let check = obj.checkSelectedRowsIndexes;  // collection which holds the page index and the selected record index
            if (check.length) {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }

            this.selectedSalaryAdvanceList = rec;

        },

        getRecords(pageInx, inx, proxy, rec) {

            if (inx.length) {
                for (let i = 0; i < inx.length; i++) {
                    let pageSize = proxy.model.pageSettings.pageSize;  //gets the page size of grid
                    let data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);     //pushing all the selected Records
                }
            }
            return rec;

        },

        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
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
    watch: {

        
    },
    created() {

        this.getPendingSalaryAdvance();
    },
});