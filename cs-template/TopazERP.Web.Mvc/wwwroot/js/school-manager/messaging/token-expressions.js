
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        tokenExpressionList: [
            { 'id': 1, 'expression': '[BillBalance]', 'description': 'Outstanding bill balance till date' },
            { 'id': 2, 'expression': '[BillAmount]', 'description': 'Current bill amount from for the current Academic year & term setup on the school profile.' },
            { 'id': 3, 'expression': '[BillNo]', 'description': 'Current bill number generated for the current Academic year & term setup on the school profile.' },
            { 'id': 4, 'expression': '[1stGuardianName]', 'description': 'Name of first guardian' },
            { 'id': 5, 'expression': '[2ndGuardianName]', 'description': 'Name of second guardian' },
            { 'id': 6, 'expression': '[StudentName]', 'description': 'Student full name' },
            { 'id': 7, 'expression': '[StaffName]', 'description': 'Staff full name' },
            { 'id': 8, 'expression': '[StudentID]', 'description': 'Student ID of student' },
            { 'id': 9, 'expression': '[ClassName]', 'description': 'Current class of student' },


        ],
    },

    methods: {

        copyToken(token) {

            navigator.clipboard.writeText(token);
        },

        renderTable() {

            $("#dataTable").ejGrid({

                dataSource: this.tokenExpressionList,
                allowPaging: true,
                isResponsive: true,
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "expression", headerText: "Expression", width: 55, },
                    { field: "description", headerText: "Description", width: 85, },

                ]
                
            });

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

        //this.renderTable();

    },
});