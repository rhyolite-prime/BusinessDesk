using Abp.Domain.Repositories;
using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Ledger.CoaDetails
{
   public class CoaDetailManager : Abp.Domain.Services.DomainService, ICoaDetailManager
    {
        private readonly IRepository<CoaDetail, Guid> _repositoryCoaDetail;
        private readonly IRepository<CoaControl, Guid> _repositoryCoaControl;
        private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;

        public CoaDetailManager(IRepository<CoaDetail, Guid> repositoryCoaDetail, IRepository<CoaControl, Guid> repositoryCoaControl, IRepository<CompanyProfile, Guid> repositoryCompanyProfile)
        {
            _repositoryCoaDetail = repositoryCoaDetail;
            _repositoryCoaControl = repositoryCoaControl;
            _repositoryCompanyProfile = repositoryCompanyProfile;
        }

        public async Task<object> Create(CoaDetail entity)
        {
            var coaControl = await _repositoryCoaControl.FirstOrDefaultAsync(x => x.Id == entity.AccountHeaderId);
        
            if (entity.AccountNo >= coaControl.MinAccount && entity.AccountNo <= coaControl.MaxAccount)
            {
                // Check for duplicate AccountNo
                var exists = await _repositoryCoaDetail.FirstOrDefaultAsync(x => x.AccountNo == entity.AccountNo);
                if (exists != null)
                {
                    return new
                    {
                        code = 409,
                        message = "Account No# already exists.",
                    };
                }
        
                entity.AccountName = entity.AccountName.Trim();
                //resolve the standard account type
                await _repositoryCoaDetail.InsertAsync(entity);
                return new
                {
                    code = 200,
                    message = "Successful",
                };
            }
        
            return new
            {
                code = 400,
                message = "Account No# must be within the allowed range.",
            };
        }

        public async Task Delete(Guid id)
        {
            await _repositoryCoaDetail.DeleteAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryCoaDetail.GetAllListAsync();
            return data.OrderBy(a=> a.AccountNo).ToList();
        }
        public async Task<object> ListActiveAccounts()
        {
            var data = await _repositoryCoaDetail.GetAllListAsync(x=>x.Status == "Active");
            return data.OrderBy(a=> a.AccountNo).ToList();
        }
        
        public async Task<object> ListLocalAccounts()
        {
            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();
        
            if (companyProfile == null || companyProfile.DefaultCurrenyId == Guid.Empty)
            {
                return new List<CoaDetail>();
            }
        
            var localAccounts = await _repositoryCoaDetail.GetAllListAsync(x => x.CurrencyId == companyProfile.DefaultCurrenyId);
        
            return localAccounts.OrderBy(a=> a.AccountNo).ToList();
        }
        
        public async Task<object> Update(CoaDetail entity)
        {
            // Check for duplicate AccountNo (excluding current entity)
            var exists = await _repositoryCoaDetail.FirstOrDefaultAsync(
                x => x.AccountNo == entity.AccountNo && x.Id != entity.Id
            );
            if (exists != null)
            {
                return new
                {
                    code = 409,
                    message = "Account No# already exists.",
                };
            }
        
            entity.AccountName = entity.AccountName.Trim();
            await _repositoryCoaDetail.UpdateAsync(entity);
            return new
            {
                code = 200,
                message = "Successful",
            };
        }

    }
}
