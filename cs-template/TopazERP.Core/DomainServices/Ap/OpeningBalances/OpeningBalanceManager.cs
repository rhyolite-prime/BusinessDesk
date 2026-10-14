using Abp.Domain.Repositories;
using TopazERP.Models.Ap;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.EntityFrameworkCore;
using TopazERP.DomainServices.Ap.OpeningBalances.Dto;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Ap.OpeningBalances;

public class OpeningBalanceManager : Abp.Domain.Services.DomainService, IOpeningBalanceManager
{
    private readonly IRepository<ApOpeningBalance, Guid> _repositoryOpeningBalances;
    private readonly IRepository<Supplier, Guid> _repositorySupplier;
    private readonly IRepository<CostCenter, Guid> _repositoryCostCenter;

    public OpeningBalanceManager(IRepository<ApOpeningBalance, Guid> repositoryOpeningBalances,
        IRepository<Supplier, Guid> repositorySupplier, IRepository<CostCenter, Guid> repositoryCostCenter)
    {
        _repositoryOpeningBalances = repositoryOpeningBalances;
        _repositorySupplier = repositorySupplier;
        _repositoryCostCenter = repositoryCostCenter;
    }

    public async Task<object> Create(ApOpeningBalance entity)
    {
        var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == entity.SupplierId);
        if (supplier == null)
        {
            return new
            {
                code = 404,
                message = "Supplier not found."
            };
        }
        
        var existingEntry = await _repositoryOpeningBalances
            .FirstOrDefaultAsync(x => x.SupplierId == entity.SupplierId && x.CurrencyId == entity.CurrencyId);

        if (existingEntry != null)
        {
            return new
            {
                code = 400,
                message = "An opening balance already exists for this supplier with the specified currency."
            };
        }

       
        await _repositoryOpeningBalances.InsertAsync(entity);

        return new
        {
            id = entity.Id,
            code = 200,
            message = "Opening balance created successfully."
        };
    }
    public async Task Update(ApOpeningBalance entity)
    {
        await _repositoryOpeningBalances.UpdateAsync(entity);
    }
    public async Task<object> ListAll()
    {
        var openingBalances = await _repositoryOpeningBalances.GetAll().ToListAsync();
        return openingBalances;
    }
    public async Task Delete(Guid id)
    {
        await _repositoryOpeningBalances.DeleteAsync(id);
    }
    //get opening balances with is_posted = true
    public async Task<object> GetPostedOpeningBalances()
    {
        var openingBalances = await _repositoryOpeningBalances.GetAll().Where(x => x.IsPosted == true).ToListAsync();
        return openingBalances;
    }
    public async Task<object> PostOpeningBalances(List<Guid> balanceIds)
    {
        foreach (var balanceId in balanceIds)
        {
            var balance = await _repositoryOpeningBalances.GetAsync(balanceId);

            if (balance == null)
            {
                continue;
            }

            if (!balance.IsPosted)
            {
                balance.IsPosted = true;
                await _repositoryOpeningBalances.UpdateAsync(balance);
            }
            var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == balance.SupplierId);
            decimal convertedAmount = balance.Amount * (balance.BuyRate / supplier.buyingRate);
            supplier.Balance += convertedAmount;
            await _repositorySupplier.UpdateAsync(supplier);
        }

        return new
        {
            code = 200,
            message = "Opening balances posted successfully."
        };
    }

    public async Task<ApOpeningBalance> GetAsync(string supplierName, string currencyName)
    {
        var openingBalance = await _repositoryOpeningBalances.FirstOrDefaultAsync(x => 
            !string.IsNullOrEmpty(supplierName) && x.SupplierName.Trim().ToLower() == supplierName.Trim().ToLower() && 
            !string.IsNullOrEmpty(currencyName) && x.CurrencyName.Trim().ToLower() == currencyName.Trim().ToLower()
        );
        return openingBalance;
    }
    
    public async Task<object> GetOuHierarchy()
    {
        var costCenters = await _repositoryCostCenter.GetAll().ToListAsync();

        // Convert to DTOs
        var costCenterDtos = costCenters.Select(cc => new CostCenterDto
        {
            Id = cc.Id,
            ParentId = cc.ParentId,
            RawName = cc.Name,
            TenantId = cc.TenantId
        }).ToList();

        var result = new List<CostCenterDto>();

        foreach (var cc in costCenterDtos)
        {
            var hierarchyName = GetHierarchyName(cc.Id, costCenterDtos);
            result.Add(new CostCenterDto
            {
                Id = cc.Id,
                ParentId = cc.ParentId,
                RawName = cc.RawName,
                Name = hierarchyName,
                TenantId = cc.TenantId
            });
        }

        return result;
    }

    private string GetHierarchyName(Guid id, List<CostCenterDto> costCenters)
    {
        var current = costCenters.FirstOrDefault(c => c.Id == id);
        if (current == null) return string.Empty;

        // Root: no parent or Guid.Empty
        if (current.ParentId == Guid.Empty)
        {
            return current.RawName;
        }

        var parent = GetHierarchyName(current.ParentId, costCenters);

        // Add "/" only if parentName is not empty
        return string.IsNullOrWhiteSpace(parent)
            ? current.RawName
            : $"{parent}/{current.RawName}";
    }
    
    public async Task<Guid?> GetOuIdByHierarchyAsync(string hierarchyName)
    {
        if (string.IsNullOrWhiteSpace(hierarchyName)) 
            return null;

        var parts = hierarchyName.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (!parts.Any()) return null;

        Guid? parentId = Guid.Empty;
        CostCenter current = null;

        foreach (var part in parts)
        {
            var name = part.Trim();

            current = await _repositoryCostCenter.FirstOrDefaultAsync(c =>
                c.Name == name &&
                c.ParentId == parentId);

            if (current == null)
            {
                return null; // hierarchy not found
            }

            parentId = current.Id; // move deeper down the tree
        }

        return current?.Id;
    }
}

    
    
    