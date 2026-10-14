const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            awards: [],
        }
    },
    methods: {
        printPreview() {
            if (!this.awards || this.awards.length === 0) {
                this.toastHandler('warning', 'No awards to print.');
                return;
            }

            const currentDate = new Date().toLocaleDateString();
            const reportHeader = `Award Types Report`;

            // Build HTML
            let html = `
    <html>
    <head>
        <title>Award Types Report</title>
        <style>
            body { font-family:"Times New Roman"; margin: 20px; }
            h3, h4 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
            thead {border-bottom: 1px solid #000;}
            th { background-color: #f2f2f2; border : none;}
            td {border: none;}
            
            /* Footer styling */
            @media print {
                body { margin-bottom: 100px; }
                .footer { 
                    position: fixed; 
                    bottom: 0; 
                    left: 0; 
                    right: 0; 
                    height: 50px; 
                    border-top: 1px solid #000; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    font-size: 12px; 
                    padding: 0 20px;
                }
            }
        </style>
    </head>
    <body>
        <h4><strong>${reportHeader}</strong></h4>

        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Award Name</th>
                </tr>
            </thead>
            <tbody>
    `;

            this.awards.forEach((award, i) => {
                html += `
            <tr>
                <td>${i + 1}</td>
                <td>${award.name || ''}</td>
            </tr>
        `;
            });

            html += `
            </tbody>
        </table>

        <!-- Footer -->
         <div class="footer">
                <div class="right">Printed On - ${currentDate}</div>
                 <div class="center">Topaz School Manager</div>
                <div class="left">Page 1</div>
        </div>
    </body>
    </html>
    `;

            const printWindow = window.open('', '', 'width=900,height=600');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        },

        getSetupData() {
            axios.get('/SmDataEntry/GetAllAwardTypes/').then(response => {

                this.awards = response.data;
                this.dataTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get awards.');

            });

        },

        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
                },
                scrollSettings: { width: "1200px", height: "400px" },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: "id", width: 25, visible: false, isPrimaryKey: true,  },
                    { field: "name", headerText: "Award Types", validationRules: { required: true, minlength: 1 }, width: 75 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15 }
                ],
                endAdd: (args) => {
                    this.saveAward(args.data);
                },
                endEdit: (args) => {
                    this.updateAward(args.data);
                },
                endDelete: (args) => {
                    this.delAward(args.data.id);
                }
            });
        },

        saveAward(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmDataEntry/CreateAwardType/', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'class saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData()
                }
            }).catch(err => {
                this.toastHandler('error', 'Unable to save input.');
            });
        },

        updateAward(payload) {


            axios.post('/SmDataEntry/UpdateAwardType/', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'data updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update data.');

            });
        },

        delAward(id) {

            axios.get('/SmDataEntry/DeleteAwardType?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'data deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete selected data');

            });
        },
        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

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

    mounted() {
        this.getSetupData();

    },
});
app.mount('#app');