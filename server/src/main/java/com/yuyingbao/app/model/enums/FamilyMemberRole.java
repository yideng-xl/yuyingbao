package com.yuyingbao.app.model.enums;

/**
 * 家庭成员角色枚举
 */
public enum FamilyMemberRole {
    /**
     * 家庭创建者
     */
    CREATOR("创建者"),
    
    /**
     * 父亲
     */
    FATHER("爸爸"),
    
    /**
     * 母亲
     */
    MOTHER("妈妈"),
    
    /**
     * 爷爷
     */
    GRANDFATHER("爷爷"),
    
    /**
     * 奶奶
     */
    GRANDMOTHER("奶奶"),
    
    /**
     * 外公
     */
    MATERNAL_GRANDFATHER("外公"),
    
    /**
     * 外婆
     */
    MATERNAL_GRANDMOTHER("外婆"),
    
    /**
     * 其他成员
     */
    OTHER("其他");

    private final String displayName;

    FamilyMemberRole(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
    
    @Override
    public String toString() {
        return this.displayName;
    }
}