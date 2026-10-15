Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;
Vue.component('date-picker', VueBootstrapDatetimePicker);
 

let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeList: [],
        employeeId: '',
        id: '',
        tenantId: '',
        loanTypeList: [],
        loanDate: moment().format("YYYY-MM-DD"),
        amount: null,
        loanTypeId: '',
       /* loanDateConfig: {
            format: 'DD-MM-YYYY',
            viewMode: 'days',
            defaultDate: new Date()
        },*/


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

        getEmployees() {

            axios.get('/PayrollDataEntry/GetEmployees').then(response => {

                response.data.forEach(v => {

                    v.employeeName = v.otherName === '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

                });

                this.employeeList = response.data.sort((a, b) => a.lastName.localeCompare(b.lastName));

                $("#employeeId").ejDropDownList({
                    dataSource: response.data,
                    watermarkText: "Select Employee",
                    width: "100%",
                    fields: { id: "id", text: "employeeName", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {

                        this.employeeId = args.value;
                    }

                });


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
        convertDate(dateStr) {
            // Split the date string into parts
            const [day, month, year] = dateStr.split('-');

            // Create a new Date object using the parts
            const date = new Date(`${year}-${month}-${day}`);

            // Convert the date to the desired format
            return date;
        },
        saveEmployeeSalaryAdvance() {


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

                this.toastHandler('warning', 'Select an employee');
                return;
            }
            

            this.isLoading = true;

            payload.employeeId = this.employeeId;

            let employeeInfo = this.getEmployeeDetails(this.employeeId);

            payload.employeeIdentifier = employeeInfo.employeeIdentifier;

            payload.employeeName = employeeInfo.employeeName;

            payload.loanDate = this.loanDate;

            payload.loanTypeId = this.loanTypeId;

            let loanInfo = this.getLoanTypeDetails(this.loanTypeId);

            payload.loanTypeName = loanInfo.name;
            payload.amount = this.amount;
            

            axios.post('/PayrollDataEntry/CreateEmployeeSalaryAdvance', payload).then(response => {

                this.toastHandler('', 'Salary advance saved.');
                this.isLoading = false;
                
                this.resetForm();

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee loan.');
                this.isLoading = false;

            });
            
            
        },
        
        getLoanTypeDetails(id) {

            return this.loanTypeList.find(a => a.id === id);
        },

        getEmployeeDetails(id) {

            return this.employeeList.find(a => a.id === id);
        },

        resetForm() {
            
            this.employeeId = '';
            
            this.loanDate = moment().format("YYYY-MM-DD");
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

        this.getEmployees();
        this.getLoanTypes();

    },
});