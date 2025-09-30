package com.yuyingbao.app.dto;

import com.yuyingbao.app.model.enums.FamilyMemberRole;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateFamilyMemberRoleRequest {
    @NotNull
    private FamilyMemberRole memberRole;
}