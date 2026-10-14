Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeList: [],
        employeeId: '',
        employeeName: '',
        id: '',
        tenantId: '',
        loanTypeList: [],
        loanDate: '',
        amount: null,
        loanTypeId: ''


    },
    validations() {

        return {

            loanTypeId: {
                required
            },
            loanDate: {
                required
            },
            amount: {
                required
            },
 
            
        }


    },
    methods: {

        getSalaryAdvanceDetails() {

            axios.get('/PayrollDataEntry/GetSalaryAdvanceDetails?id='+ this.id).then(response => {

                if (response.data) {

                    this.employeeId = response.data.employeeId;
                    this.loanDate =  this.formatDate(response.data.loanDate)    ;
                    this.loanTypeId = response.data.loanTypeId;
                    this.employeeName = response.data.employeeName;
                    this.employeeIdentifier = response.data.employeeIdentifier; 
                    this.employeeId = response.data.employeeId;
                    this.amount = response.data.amount;
                    this.tenantId = response.data.tenantId;

                }

            }).catch(err => {

                //console.log(err);
            });
        },
 
        getLoanTypes() {

            axios.get('/PayrollSetups/GetLoanTypes').then(response => {
 
                this.loanTypeList = response.data
                
            }).catch(err => {
                //console.log(err);
            });

        },

        updateSalaryAdvance() {


            this.$v.$touch();

            if (this.$v.$invalid) {

                for (let key in Object.keys(this.$v)) {

                    const input = Object.keys(this.$v)[key];

                    if (this.$v[input].$error) {

                        this.$refs[input].focus();

                        break;
                    }

                }

                return;
            }  

            let payload = {};

            if (!this.employeeId) {

                this.toastHandler('warning', 'Employee record not found');
                return;

            }

            this.isLoading = true;

            payload.id = this.id;
            payload.employeeId = this.employeeId;

            payload.employeeIdentifier = this.employeeIdentifier;

            payload.employeeName = this.employeeName;

            payload.loanDate = this.loanDate;

            payload.loanTypeId = this.loanTypeId;

            let loanInfo = this.getLoanTypeDetails(this.loanTypeId);

            payload.loanTypeName = loanInfo.name;
            payload.amount = this.amount;
            

            axios.post('/PayrollDataEntry/UpdateEmployeeSalaryAdvance', payload).then(response => {

                this.toastHandler('', 'Salary advance updated.');
                this.isLoading = false;
                
                //redirect to list page
                window.location.href = '/PayrollDataEntry/SalaryAdvanceApprovals';

            }).catch(err => {

                this.toastHandler('error', 'Unable to updated salary advance.');
                this.isLoading = false;

            });
            
            
        },
        
        getLoanTypeDetails(id) {

            return this.loanTypeList.find(a => a.id === id);
        },

        getEmployeeDetails(id) {

            return this.employeeList.find(a => a.id === id);
        },

        initControls() {


            $( () => {


                $("#loanDate").ejDatePicker({
                    width: "100%",
                    value: new Date(),
                    dateFormat: "dd-MMM-yyyy",
                    change: (args) => {
                        if (args.value) {

                            this.loanDate = args.value
                        }
                    }

                });

                


            });


        },

        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        
        resetForm() {
            
            this.employeeId = '';
            
            this.loanDate = '';
            this.loanTypeId = '';
            this.amount = null;
            this.id = '';
            this.tenantId = '';

            let employeeDropdown = $("#employeeId").data("ejDropDownList");
            employeeDropdown.clearText();
            employeeDropdown.option("value", "");

            this.$v.$reset();
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

        this.id = id;
        this.initControls();
        this.getSalaryAdvanceDetails();
        this.getLoanTypes();

    },
});