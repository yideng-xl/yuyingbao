package com.yuyingbao.app.service;

import com.yuyingbao.app.model.entity.Baby;
import com.yuyingbao.app.model.entity.FamilyMember;
import com.yuyingbao.app.repository.BabyRepository;
import com.yuyingbao.app.repository.FamilyMemberRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 权限检查服务
 * 确保用户只能访问其有权限的数据
 */
@Service
public class PermissionService {

    private final FamilyMemberRepository familyMemberRepository;
    private final BabyRepository babyRepository;

    public PermissionService(FamilyMemberRepository familyMemberRepository, BabyRepository babyRepository) {
        this.familyMemberRepository = familyMemberRepository;
        this.babyRepository = babyRepository;
    }

    /**
     * 检查用户是否有访问指定家庭的权限
     * @param userId 用户ID
     * @param familyId 家庭ID
     * @return 是否有权限
     */
    public boolean hasAccessToFamily(Long userId, Long familyId) {
        return familyMemberRepository.findByFamilyIdAndUserId(familyId, userId).isPresent();
    }

    /**
     * 检查用户是否有访问指定宝宝的权限
     * @param userId 用户ID
     * @param babyId 宝宝ID
     * @return 是否有权限
     */
    public boolean hasAccessToBaby(Long userId, Long babyId) {
        Baby baby = babyRepository.findById(babyId).orElse(null);
        if (baby == null) {
            return false;
        }
        return hasAccessToFamily(userId, baby.getFamilyId());
    }

    /**
     * 获取用户有权限访问的家庭ID列表
     * @param userId 用户ID
     * @return 家庭ID列表
     */
    public List<Long> getUserAccessibleFamilyIds(Long userId) {
        List<FamilyMember> familyMembers = familyMemberRepository.findByUserId(userId);
        return familyMembers.stream()
                .map(FamilyMember::getFamilyId)
                .toList();
    }

    /**
     * 获取用户有权限访问的宝宝ID列表
     * @param userId 用户ID
     * @return 宝宝ID列表
     */
    public List<Long> getUserAccessibleBabyIds(Long userId) {
        List<Long> familyIds = getUserAccessibleFamilyIds(userId);
        if (familyIds.isEmpty()) {
            return List.of();
        }
        
        List<Baby> babies = babyRepository.findByFamilyIdIn(familyIds);
        return babies.stream()
                .map(Baby::getId)
                .toList();
    }

    /**
     * 验证并抛出异常（如果无权限）
     * @param userId 用户ID
     * @param familyId 家庭ID
     * @throws SecurityException 如果无权限
     */
    public void validateFamilyAccess(Long userId, Long familyId) {
        if (!hasAccessToFamily(userId, familyId)) {
            throw new SecurityException("用户无权限访问指定家庭");
        }
    }

    /**
     * 验证并抛出异常（如果无权限）
     * @param userId 用户ID
     * @param babyId 宝宝ID
     * @throws SecurityException 如果无权限
     */
    public void validateBabyAccess(Long userId, Long babyId) {
        if (!hasAccessToBaby(userId, babyId)) {
            throw new SecurityException("用户无权限访问指定宝宝");
        }
    }
}